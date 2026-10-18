'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const moduleURL=pathToFileURL(path.resolve(__dirname,'../../js/membership-client.mjs')).href;
const config={mode:'emulator',firebase:{projectId:'demo-game-editor-membership'},verificationContinueUrl:'http://localhost:8000/index.html'};
const location={hostname:'localhost',origin:'http://localhost:8000'};
test('active deployment uses only Spark services and membership is independent of game IDs',()=>{
  const fs=require('node:fs'),root=path.resolve(__dirname,'../..'),config=JSON.parse(fs.readFileSync(path.join(root,'membership-backend/firebase.json'),'utf8'));
  assert.deepEqual(Object.keys(config).sort(),['emulators','firestore']);assert.deepEqual(Object.keys(config.emulators).filter(x=>!['ui','singleProjectMode'].includes(x)).sort(),['auth','firestore']);
  const client=fs.readFileSync(path.join(root,'js/membership-client.mjs'),'utf8');assert.ok(!/httpsCallable|firebase\.functions|\.storage\(/.test(client));assert.ok(!/native-\d\d|gameIds|allowedGames/.test(client));
  assert.ok(fs.readFileSync(path.join(root,'js/membership-config.js'),'utf8').includes('productionReviewed:false'));
});
function fixture(){
  let authListener,snapshotListener,resolveAccess,memberDisposals=0,authDisposals=0;
  const callbacks=[],user={uid:'member',emailVerified:true};
  const auth={currentUser:user,setPersistence:()=>Promise.resolve(),useEmulator(){},
    onIdTokenChanged(cb){authListener=cb;return ()=>authDisposals++;},signOut:async()=>{auth.currentUser=null;await authListener(null);}};
  const db={useEmulator(){},doc:()=>({get:()=>new Promise(resolve=>{resolveAccess=resolve;}),onSnapshot(options,cb){snapshotListener=cb;return ()=>memberDisposals++;}})};
  const functions={useEmulator(){},httpsCallable:()=>()=>new Promise(resolve=>{resolveAccess=resolve;})};
  const firebase={auth:{Auth:{Persistence:{SESSION:'session'}}},firestore(){},functions(){},initializeApp:()=>({auth:()=>auth,firestore:()=>db,functions:()=>functions})};
  return {firebase,callbacks,auth,
    emitAuth:()=>authListener(user),emitSnapshot:status=>snapshotListener({data:()=>({status,entitlement:'lifetime'}),metadata:{fromCache:false}}),
    resolve:()=>resolveAccess({exists:true,data:()=>({enabled:true})}),counts:()=>({memberDisposals,authDisposals})};
}
test('client rejects legacy project, remote emulator, unknown mode and unreviewed production before use',async()=>{
  const {createMembershipClient}=await import(moduleURL);
  for(const [c,l] of [[{...config,firebase:{projectId:'krukung-game-hub'}},location],[config,{hostname:'example.com',origin:'https://example.com'}],[{...config,mode:'unknown'},location],[{...config,mode:'production',firebase:{projectId:'new-project'}},location]])assert.throws(()=>createMembershipClient({},c,l));
});
test('late approved response cannot reopen disabled session; subscriptions dispose once',async()=>{
  const {createMembershipClient}=await import(moduleURL),f=fixture(),client=createMembershipClient(f.firebase,config,location);
  const stop=client.watchSession(state=>f.callbacks.push(state));
  assert.throws(()=>client.watchSession(()=>{}));
  await f.emitAuth();const pending=f.emitSnapshot('approved');
  await f.emitSnapshot('disabled');f.resolve();await pending;
  assert.equal(f.callbacks.at(-1).state,'disabled');assert.equal(f.callbacks.some(x=>x.allowed),false);
  stop();assert.deepEqual(f.counts(),{memberDisposals:1,authDisposals:1});
});
test('sign out invalidates an in-flight access request without using persistent membership flags',async()=>{
  const {createMembershipClient}=await import(moduleURL),f=fixture(),client=createMembershipClient(f.firebase,config,location);
  const stop=client.watchSession(state=>f.callbacks.push(state));await f.emitAuth();
  const pending=f.emitSnapshot('approved');await new Promise(r=>setImmediate(r));await client.logout();f.resolve();await pending;
  assert.equal(f.callbacks.at(-1).state,'signed-out');assert.equal(f.callbacks.some(x=>x.allowed),false);stop();
});

