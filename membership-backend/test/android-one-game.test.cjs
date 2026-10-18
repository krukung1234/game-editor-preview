'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {createServer}=require('../../tools/serve-android-one-game.cjs');
test('one-game route isolation and private identity requirement',async()=>{
 const root=path.resolve(__dirname,'../..'),login='device-test@example.invalid',server=createServer({root,login});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port,origin='http://127.0.0.1:'+port;
 try{
  assert.equal(server.address().address,'127.0.0.1');
  assert.equal((await fetch(origin)).status,403);
  assert.equal((await fetch(origin,{headers:{host:'public.example.ts.net'}})).status,403);
  assert.equal((await fetch(origin,{headers:{'Tailscale-User-Login':'other@example.invalid'}})).status,403);
  const headers={'Tailscale-User-Login':login},response=await fetch(origin,{headers});assert.equal(response.status,200);
  assert.equal(await response.text(),fs.readFileSync(path.join(root,'games/ar-words-english/index.html'),'utf8'));
  assert.equal(response.headers.get('permissions-policy'),'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.equal((await fetch(origin+'/cover.png',{headers})).status,200);
  assert.equal((await fetch(origin,{headers,method:'POST',body:'no-upload'})).status,405);
  for(const url of ['/admin.html','/membership-admin.html','/editor.html','/js/membership-config.js','/js/config.js','/membership-backend/firestore.rules','/.git/config','/.env','/docs/','/games/AR_ANATOMY_LAB_A01/index.html','/index.html/extra','/%2e%2e%2fjs%2fconfig.js','/%5c..%5cconfig.js'])assert.equal((await fetch(origin+url,{headers})).status,404,url);
  const invalid=await new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:'/%ZZ',headers},r=>{r.resume();resolve(r.statusCode)});req.on('error',reject);req.end();});assert.equal(invalid,400);
  assert.throws(()=>createServer({root,login:''}));
 }finally{await new Promise(r=>server.close(r));}
});
