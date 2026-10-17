'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),p=require('../policy.cjs');
const member={uid:'member',token:{email:'member@example.test',email_verified:true}};
const user={emailVerified:true,disabled:false,customClaims:{editorAdmin:true}};
const rejects=(fn,code)=>assert.throws(fn,e=>e.code===code);
test('never accepts old, unset, mismatched or non-demo emulator project',()=>{
  for(const args of [['krukung-game-hub','krukung-game-hub',false],[undefined,undefined,false],['new','other',false],['new','new',true]])rejects(()=>p.assertProject(...args),'failed-precondition');
  p.assertProject('demo-game-editor-membership','demo-game-editor-membership',true);
  p.assertProject('new-project','new-project',false);
});
test('registration only accepts bounded Facebook name; cannot smuggle status/password/role',()=>{
  assert.equal(p.profileInput({facebookName:'  ครูกุ้ง  '}).facebookName,'ครูกุ้ง');
  for(const input of [{facebookName:''},{facebookName:'x'.repeat(121)},{facebookName:'A\nB'},{facebookName:'name',status:'approved'},{facebookName:'name',role:'admin'},{facebookName:'name',password:'secret'}])rejects(()=>p.profileInput(input),'invalid-argument');
});
test('pending, rejected, disabled and missing membership cannot enter; verified lifetime has no expiry',()=>{
  for(const status of ['pending','rejected','disabled',undefined])rejects(()=>p.eligible(member,user,{status,entitlement:'lifetime'}),'permission-denied');
  rejects(()=>p.eligible(member,user,{status:'approved',entitlement:null}),'permission-denied');
  rejects(()=>p.eligible({...member,token:{...member.token,email_verified:false}},user,{status:'approved',entitlement:'lifetime'}),'permission-denied');
  rejects(()=>p.eligible(member,{...user,disabled:true},{status:'approved',entitlement:'lifetime'}),'permission-denied');
  assert.equal(p.eligible(member,user,{status:'approved',entitlement:'lifetime',approvedAt:'2000-01-01'}),true);
});
test('admin must be verified and server claims current; client claims/admin_ok do not grant role',()=>{
  p.administrator(member,user);
  for(const u of [{...user,customClaims:{}},{...user,disabled:true},{...user,emailVerified:false}])rejects(()=>p.administrator({...member,token:{...member.token,editorAdmin:true}},u),'permission-denied');
  rejects(()=>p.administrator(null,user),'unauthenticated');
});
test('status transition matrix and revision checks prevent stale approvals and self approval',()=>{
  for(const [action,from,to] of [['approve','pending','approved'],['approve','rejected','approved'],['reject','pending','rejected'],['disable','approved','disabled'],['restore','disabled','approved']]){
    const change=p.statusChange({uid:'member',action,revision:3,requestId:'1234567890abcdef'}, {status:from,revision:3},'admin','member');
    assert.deepEqual(change,{status:to,revision:4,entitlement:to==='approved'?'lifetime':null});
  }
  const input={uid:'member',action:'approve',revision:0,requestId:'1234567890abcdef'};
  rejects(()=>p.statusChange(input,{status:'pending',revision:1},'admin','member'),'aborted');
  rejects(()=>p.statusChange(input,{status:'disabled',revision:0},'admin','member'),'failed-precondition');
  rejects(()=>p.statusChange(input,{status:'pending',revision:0},'member','member'),'permission-denied');
  rejects(()=>p.statusChange({...input,role:'admin'},{status:'pending',revision:0},'admin','member'),'invalid-argument');
  rejects(()=>p.statusChange({...input,action:'constructor'},{status:'pending',revision:0},'admin','member'),'invalid-argument');
  rejects(()=>p.statusChange({...input,revision:-1},{status:'pending',revision:-1},'admin','member'),'invalid-argument');
});
