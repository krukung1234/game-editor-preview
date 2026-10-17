'use strict';
// Real integration suite supplied for Emulator. Never run against production.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const project='demo-game-editor-membership';
if(process.env.GCLOUD_PROJECT!==project||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Only the local demo emulators are allowed');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection,setDoc,updateDoc}=require('firebase/firestore');
const {ref,getBytes,uploadBytes}=require('firebase/storage');
const {initializeApp}=require('../functions/node_modules/firebase-admin/app');
const {getAuth}=require('../functions/node_modules/firebase-admin/auth');
const {getFirestore}=require('../functions/node_modules/firebase-admin/firestore');
initializeApp({projectId:project});const adminAuth=getAuth(),adminDb=getFirestore();
async function identity(action,body){
  const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:'+action+'?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return {status:response.status,...await response.json()};
}
async function call(name,token,data){
  const response=await fetch('http://127.0.0.1:5001/'+project+'/asia-southeast1/'+name,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({data})});
  return {status:response.status,...await response.json()};
}
test('Auth + callable backend + Firestore/Storage Rules on demo emulators',async()=>{
  const env=await initializeTestEnvironment({projectId:project,firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('firestore.rules','utf8')},storage:{host:'127.0.0.1',port:9199,rules:fs.readFileSync('storage.rules','utf8')}});
  try{
    await env.clearFirestore();
    const email='member-'+Date.now()+'@example.test',password='MembershipTest123!';
    let account=await identity('signUp',{email,password,returnSecureToken:true});assert.equal(account.status,200);
    const uid=account.localId;
    assert.notEqual((await identity('signUp',{email,password,returnSecureToken:true})).status,200);
    assert.notEqual((await call('getEditorAccess',null,{})).status,200);
    assert.notEqual((await call('registerEditorMember',account.idToken,{facebookName:'Tester',status:'approved'})).status,200);
    assert.equal((await call('registerEditorMember',account.idToken,{facebookName:'Tester'})).result.status,'pending');
    assert.notEqual((await call('getEditorAccess',account.idToken,{})).status,200);
    assert.notEqual((await call('listEditorMembers',account.idToken,{})).status,200);
    const a=env.authenticatedContext(uid,{email,email_verified:true}),b=env.authenticatedContext('other',{email:'other@example.test'}),client=a.firestore();
    await assertSucceeds(getDoc(doc(client,'editorMembers',uid)));
    await assertFails(getDoc(doc(b.firestore(),'editorMembers',uid)));
    await assertFails(getDocs(collection(client,'editorMembers')));
    await assertFails(updateDoc(doc(client,'editorMembers',uid),{status:'approved',entitlement:'lifetime'}));
    await assertFails(setDoc(doc(client,'editorMemberAudit','forged'),{actor:uid}));
    await env.withSecurityRulesDisabled(async ctx=>uploadBytes(ref(ctx.storage(),'games/test.html'),new Uint8Array([1])));
    await assertFails(getBytes(ref(a.storage(),'games/test.html')));
    await assertFails(uploadBytes(ref(a.storage(),'games/test.html'),new Uint8Array([1])));
    const adminEmail='admin-'+Date.now()+'@example.test';
    const adminUser=await adminAuth.createUser({email:adminEmail,password,emailVerified:true});
    await adminAuth.setCustomUserClaims(adminUser.uid,{editorAdmin:true});
    const adminLogin=await identity('signInWithPassword',{email:adminEmail,password,returnSecureToken:true});
    const input={uid,action:'approve',revision:0,requestId:crypto.randomUUID()};
    assert.notEqual((await call('changeEditorMemberStatus',adminLogin.idToken,input)).status,200); // email unverified
    assert.equal((await identity('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:account.idToken})).status,200);
    const codes=await (await fetch('http://127.0.0.1:9099/emulator/v1/projects/'+project+'/oobCodes')).json();
    const verification=codes.oobCodes.find(code=>code.email===email&&code.requestType==='VERIFY_EMAIL');assert.ok(verification);
    assert.equal((await identity('update',{oobCode:verification.oobCode})).status,200);
    account=await identity('signInWithPassword',{email,password,returnSecureToken:true});
    const approve=await call('changeEditorMemberStatus',adminLogin.idToken,input);assert.equal(approve.result.status,'approved');
    assert.deepEqual((await call('changeEditorMemberStatus',adminLogin.idToken,input)).result,approve.result);
    assert.equal((await call('getEditorAccess',account.idToken,{})).result.entitlement,'lifetime');
    assert.equal((await call('getEditorMemberSummary',adminLogin.idToken,{})).result.approved,1);
    assert.equal((await call('listEditorMembers',adminLogin.idToken,{status:'approved',search:'tes',searchBy:'facebookName'})).result.members.length,1);
    assert.notEqual((await call('changeEditorMemberStatus',account.idToken,{uid,action:'approve',revision:1,requestId:crypto.randomUUID()})).status,200);
    assert.equal((await call('changeEditorMemberStatus',adminLogin.idToken,{uid,action:'disable',revision:1,requestId:crypto.randomUUID()})).result.status,'disabled');
    assert.notEqual((await call('getEditorAccess',account.idToken,{})).status,200);
    assert.equal((await call('changeEditorMemberStatus',adminLogin.idToken,{uid,action:'restore',revision:2,requestId:crypto.randomUUID()})).result.status,'approved');
    assert.equal((await adminDb.collection('editorNotificationOutbox').get()).size,3); // signup, approve, restore
    assert.equal((await identity('sendOobCode',{requestType:'PASSWORD_RESET',email})).status,200);
    const resets=await (await fetch('http://127.0.0.1:9099/emulator/v1/projects/'+project+'/oobCodes')).json();
    const reset=resets.oobCodes.find(code=>code.email===email&&code.requestType==='PASSWORD_RESET');assert.ok(reset);
    assert.equal((await identity('resetPassword',{oobCode:reset.oobCode,newPassword:'ChangedPassword123!'})).status,200);
    assert.equal((await identity('signInWithPassword',{email,password:'ChangedPassword123!',returnSecureToken:true})).status,200);
    await adminAuth.setCustomUserClaims(adminUser.uid,{});
    assert.notEqual((await call('listEditorMembers',adminLogin.idToken,{})).status,200); // old token no longer admin
  }finally{await env.cleanup();}
});
