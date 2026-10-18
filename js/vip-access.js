/* UI gate only. Backend/Rules authorize private data; public files remain public. */
(()=>{'use strict';const home=new URL('../index.html',document.currentScript.src).href;
let state={allowed:false,state:'checking'},first=true,resolveReady,client=null,stopSession=null;
const ready=new Promise(resolve=>{resolveReady=resolve;});
function update(next){
 if(next.state==='checking'&&state.allowed&&next.identity?.uid===state.identity?.uid)return;
 const previous=state;state=Object.freeze({...next,allowed:next.allowed===true});
 if(first&&next.state!=='checking'){first=false;resolveReady(state.allowed);}
 window.dispatchEvent(new CustomEvent('vip-access-change',{detail:{...state,wasAllowed:previous.allowed}}));
}
window.VipAccess=Object.freeze({ready,allowed:()=>state.allowed,state:()=>state,
 require(){if(state.allowed)return true;location.replace(home);return false;},
 async authorize(){await ready;if(!state.allowed||!client)return false;try{await client.refreshAccess();return state.allowed;}catch{update({...state,allowed:false,state:'access-denied'});return false;}},
 async logout(){update({allowed:false,state:'signed-out'});await client?.logout();},
 attach(value){if(client)throw Error('Membership already initialized');client=value;stopSession=client.watchSession(update);},
 dispose(){stopSession?.();stopSession=null;},fail(){update({allowed:false,state:'unavailable'});}
});addEventListener('pageshow',event=>{if(event.persisted)location.reload();});})();
