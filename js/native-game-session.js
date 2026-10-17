/* Runs only inside a composed personal game, before its unmodified mechanics initialize. */
(() => {
 'use strict';
 const config=window.__NativeGameConfig;if(!config)return;
 const base=config.packaged?new URL('../',document.baseURI):new URL(config.projectRoot),assets=config.data.assets||{},defs=config.assetDefinitions||{},score=new Map();
 const resolve=value=>value?.startsWith('@package:')?new URL(value.slice(9),base).href:new URL(value||'',base).href;
 const assetURLs=Object.fromEntries(Object.entries(assets).map(([key,value])=>[key,value?resolve(value):'']));
 const files=new Map();for(const [key,def]of Object.entries(defs))if(def.path)files.set(new URL(def.path,document.baseURI).href,assetURLs[key]);
 function asset(value){try{return files.get(new URL(value,document.baseURI).href)??value}catch{return value}}
 function hydrate(value){if(typeof value==='string')return value.startsWith('@native-image:')?assetURLs[value.slice(14)]:value;if(Array.isArray(value))return value.map(hydrate);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,hydrate(v)]));return value}
 function memory(){const map=new Map();const methods={getItem:key=>map.get(String(key))??null,setItem:(key,value)=>{map.set(String(key),String(value))},removeItem:key=>map.delete(String(key)),clear:()=>map.clear(),key:i=>[...map.keys()][i]??null};return new Proxy(methods,{get:(target,key)=>key==='length'?map.size:key in target?target[key]:map.get(String(key)),set:(_,key,value)=>{map.set(String(key),String(value));return true}})}
 for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{configurable:true,value:memory()});
 const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(value){src.set.call(this,asset(value))}});
 function cssAssets(value){return String(value).replace(/url\(\s*(["']?)(.*?)\1\s*\)/g,(all,quote,url)=>{const replacement=asset(url);return replacement===url?all:replacement?'url("'+String(replacement).replaceAll('"','%22')+'")':'none'})}
 const cssSet=CSSStyleDeclaration.prototype.setProperty;
 CSSStyleDeclaration.prototype.setProperty=function(name,value,priority){return cssSet.call(this,name,/background/.test(name)?cssAssets(value):value,priority)};
 for(const [property,name]of [['backgroundImage','background-image'],['background','background']])Object.defineProperty(CSSStyleDeclaration.prototype,property,{configurable:true,get(){return this.getPropertyValue(name)},set(value){cssSet.call(this,name,cssAssets(value))}});
 const set=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){return set.call(this,name,this instanceof HTMLImageElement&&name.toLowerCase()==='src'?asset(value):name.toLowerCase()==='style'?cssAssets(value):value)};
 const rootStyle=document.documentElement.style;Object.entries(defs).forEach(([key,def],i)=>{const url=assetURLs[key];rootStyle.setProperty('--ng-img-'+i,url?'url("'+url.replaceAll('"','%22')+'")':'none')});
 let toast,timer;function praise(){if(!config.data.meta.praise)return;if(!toast){toast=document.createElement('div');toast.className='native-personal-praise';toast.setAttribute('role','status');const style=document.createElement('style');style.textContent='.native-personal-praise{position:fixed;z-index:2147483000;left:50%;bottom:10%;transform:translateX(-50%);max-width:90vw;background:#f5efffee;color:#422277;border:2px solid #c7b0f6;border-radius:18px;padding:10px 16px;font:bold 18px/1.4 system-ui;text-align:center;pointer-events:none;overflow-wrap:anywhere}';document.head.append(style);document.body.append(toast)}toast.textContent=config.data.meta.praise;toast.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{toast.hidden=true},1400)}
 const status={constructors:{},frames:{}};
 const streams=new Set(),instances=new Set();let disposed=false;
 if(navigator.mediaDevices?.getUserMedia){const getMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await getMedia(constraints);if(disposed){for(const track of stream.getTracks())track.stop();throw new DOMException('Game session closed','AbortError')}for(const old of streams)if(old.getTracks().every(t=>t.readyState==='ended'))streams.delete(old);streams.add(stream);for(const track of stream.getTracks())track.addEventListener('ended',()=>{if(stream.getTracks().every(t=>t.readyState==='ended'))streams.delete(stream)},{once:true});return stream}}
 for(const name of ['Hands','Camera','FaceDetection','SelfieSegmentation']){
  let current;Object.defineProperty(window,name,{configurable:true,get:()=>current,set:Native=>{
   if(typeof Native!=='function'){current=Native;return}
   current=class extends Native{constructor(options,...args){if(['Hands','FaceDetection','SelfieSegmentation'].includes(name)){const original=options?.locateFile;options={...options,locateFile:file=>config.packaged&&config.arFiles?.[file]?new URL(config.arFiles[file],base).href:original?original(file):config.sdkBases?.[name]?new URL(file,config.sdkBases[name]).href:file}}super(options,...args);instances.add(this);status.constructors[name]=(status.constructors[name]||0)+1}
    onResults(callback){return super.onResults(result=>{if(disposed)return;status.frames[name]=(status.frames[name]||0)+1;callback(result)})}
    close(...args){instances.delete(this);return super.close?.(...args)}
    stop(...args){instances.delete(this);return super.stop?.(...args)}}
  }});
 }
 window.NativeGameSession={praise,dispose,resource:url=>config.packaged&&config.resourceURLs?.[url]?new URL(config.resourceURLs[url],base).href:url,binding:name=>hydrate(config.bindings[name]),asset,arStatus:status,
  record(key,result,current){if(Number.isFinite(current)){const previous=score.get(key)||0;score.set(key,current);if(current>previous)praise();window.dispatchEvent(new CustomEvent('native-game-score',{detail:{key,value:current,previous}}))}return result},
  scores:()=>Object.fromEntries(score)
 };
 function updateImages(node){
  if(node.nodeType!==1)return;const nodes=[node,...node.querySelectorAll('img,[style]')];for(const item of nodes){if(item instanceof HTMLImageElement&&item.getAttribute('src')){const value=asset(item.getAttribute('src'));if(value!==item.getAttribute('src'))item.src=value}const style=item.getAttribute('style');if(style&&style.includes('url(')){const value=cssAssets(style);if(value!==style)set.call(item,'style',value)}}
 }
 const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)updateImages(node)});observer.observe(document.documentElement,{childList:true,subtree:true});
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();clearTimeout(timer);for(const stream of streams)for(const track of stream.getTracks())track.stop();for(const instance of [...instances])for(const method of ['stop','close'])try{Promise.resolve(instance[method]?.()).catch(()=>{})}catch{}streams.clear();instances.clear()}
 window.addEventListener('pagehide',event=>{if(!event.persisted)dispose()},{once:true});
 document.addEventListener('DOMContentLoaded',()=>{for(const image of document.querySelectorAll('img[data-native-image]')){if(image.getAttribute('src'))continue;const value=assetURLs[image.dataset.nativeImage];if(value)image.src=value;else image.hidden=true}} ,{once:true});
})();
