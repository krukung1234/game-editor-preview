'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue,FieldPath}=require('firebase-admin/firestore');
const p=require('./policy.cjs');
const emulator=process.env.FUNCTIONS_EMULATOR==='true';
const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT;
const expected=emulator?'demo-game-editor-membership':process.env.EDITOR_MEMBERSHIP_PROJECT_ID;
// No Admin SDK access to the old project, even if misconfigured.
p.assertProject(project,expected,emulator);
if(emulator&&(!process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.env.FIRESTORE_EMULATOR_HOST))throw Error('Both Auth and Firestore emulators are required; refusing fallback');
initializeApp({projectId:project});
const db=getFirestore(),auth=getAuth(),members=db.collection('editorMembers');
const options={region:'asia-southeast1',maxInstances:2,timeoutSeconds:30,memory:'256MiB'};
// App Check enforcement is a later deployment prerequisite, not silently enabled here.
function callable(handler){return onCall(options,async request=>{
  try{return await handler(request);}catch(e){
    if(e instanceof HttpsError)throw e;
    if(e instanceof p.PolicyError)throw new HttpsError(e.code,e.message);
    // Never return SDK internals, PII or credentials to the browser.
    throw new HttpsError('internal','ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
  }
});}
async function admin(request){
  p.signedIn(request.auth);
  // Read authoritative claims each request; a stale ID token cannot keep a revoked admin role.
  const user=await auth.getUser(request.auth.uid);p.administrator(request.auth,user);
  return user;
}
function clean(doc){
  const v=doc.data();if(!v)return null;
  const iso=t=>t?.toDate?t.toDate().toISOString():null;
  return {uid:doc.id,facebookName:v.facebookName,email:v.email,status:v.status,entitlement:v.entitlement,
    revision:v.revision,createdAt:iso(v.createdAt),updatedAt:iso(v.updatedAt),approvedAt:iso(v.approvedAt),approvedBy:v.approvedBy||null};
}
exports.registerEditorMember=callable(async request=>{
  const uid=p.signedIn(request.auth),profile=p.profileInput(request.data);
  const user=await auth.getUser(uid);
  if(user.disabled||!user.email)throw new HttpsError('permission-denied','บัญชีนี้ไม่สามารถสมัครได้');
  const ref=members.doc(uid);
  await db.runTransaction(async tx=>{
    const old=await tx.get(ref);if(old.exists)return; // Retry after network failure never resets approved/disabled state.
    const now=FieldValue.serverTimestamp();
    tx.create(ref,{uid,...profile,email:user.email,emailKey:user.email.toLowerCase(),status:'pending',entitlement:null,
      revision:0,createdAt:now,updatedAt:now,approvedAt:null,approvedBy:null});
    tx.create(db.doc('editorNotificationOutbox/application_'+uid),{type:'new-application',memberUid:uid,state:'queued',createdAt:now,attempts:0});
  });
  return clean(await ref.get());
});
exports.getEditorAccess=callable(async request=>{
  const uid=p.signedIn(request.auth),user=await auth.getUser(uid),doc=await members.doc(uid).get();
  p.eligible(request.auth,user,doc.data());
  return {allowed:true,entitlement:'lifetime',revision:doc.data().revision};
});
exports.listEditorMembers=callable(async request=>{
  await admin(request);
  const data=request.data||{},status=data.status||'',term=String(data.search||'').trim().normalize('NFC').toLocaleLowerCase('th');
  if(status&&!['pending','approved','rejected','disabled'].includes(status))throw new HttpsError('invalid-argument','สถานะไม่ถูกต้อง');
  if(term.length>120||data.searchBy&&!['facebookName','email'].includes(data.searchBy))throw new HttpsError('invalid-argument','คำค้นไม่ถูกต้อง');
  let query=members;
  if(status)query=query.where('status','==',status);
  if(term){
    const field=data.searchBy==='email'?'emailKey':'facebookKey';
    query=query.orderBy(field).orderBy(FieldPath.documentId()).startAt(term).endAt(term+'\uf8ff');
    if(data.cursor){
      if(typeof data.cursor.key!=='string'||typeof data.cursor.uid!=='string')throw new HttpsError('invalid-argument','ตัวแบ่งหน้าไม่ถูกต้อง');
      query=query.startAfter(data.cursor.key,data.cursor.uid);
    }
  }else{
    query=query.orderBy(FieldPath.documentId());
    if(data.cursor){if(typeof data.cursor.uid!=='string')throw new HttpsError('invalid-argument','ตัวแบ่งหน้าไม่ถูกต้อง');query=query.startAfter(data.cursor.uid);}
  }
  const snap=await query.limit(51).get(),shown=snap.docs.slice(0,50),last=shown.at(-1);
  return {members:shown.map(clean),nextCursor:snap.size>50?{uid:last.id,...(term?{key:last.data()[data.searchBy==='email'?'emailKey':'facebookKey']}:{} )}:null};
});
exports.getEditorMemberSummary=callable(async request=>{
  await admin(request);const result={};
  await Promise.all(['pending','approved','rejected','disabled'].map(async status=>{result[status]=(await members.where('status','==',status).count().get()).data().count;}));
  return result;
});
exports.getEditorMemberDetail=callable(async request=>{
  await admin(request);const uid=request.data?.uid;
  if(typeof uid!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(uid))throw new HttpsError('invalid-argument','UID ไม่ถูกต้อง');
  const doc=await members.doc(uid).get();if(!doc.exists)throw new HttpsError('not-found','ไม่พบสมาชิก');
  return clean(doc);
});
exports.changeEditorMemberStatus=callable(async request=>{
  await admin(request);
  const input=request.data,uid=input?.uid;
  // Validate path and id before building any reference; then validate state inside transaction.
  if(typeof uid!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(uid)||!/^[-A-Za-z0-9_]{16,80}$/.test(input.requestId||''))throw new HttpsError('invalid-argument','ข้อมูลคำสั่งไม่ถูกต้อง');
  const targetUser=await auth.getUser(uid);
  if(['approve','restore'].includes(input.action)&&(!targetUser.emailVerified||targetUser.disabled))throw new HttpsError('failed-precondition','สมาชิกต้องยืนยันอีเมลและบัญชีต้องใช้งานได้ก่อนอนุมัติ');
  const ref=members.doc(uid),op=db.doc('editorMemberOperations/'+input.requestId);
  return db.runTransaction(async tx=>{
    const [old,previous]=await Promise.all([tx.get(ref),tx.get(op)]);
    if(previous.exists){
      const v=previous.data();
      if(v.actor!==request.auth.uid||v.uid!==uid||v.action!==input.action)throw new HttpsError('already-exists','รหัสคำสั่งถูกใช้แล้ว');
      return v.result;
    }
    const update=p.statusChange(input,old.data(),request.auth.uid,uid),now=FieldValue.serverTimestamp();
    const stamp=update.status==='approved'?{approvedAt:now,approvedBy:request.auth.uid}:{};
    tx.update(ref,{...update,...stamp,updatedAt:now});
    const result={uid,...update};
    tx.create(op,{actor:request.auth.uid,uid,action:input.action,result,createdAt:now});
    tx.create(db.doc('editorMemberAudit/'+input.requestId),{actor:request.auth.uid,uid,action:input.action,from:old.data().status,to:update.status,createdAt:now});
    if(update.status==='approved')tx.create(db.doc('editorNotificationOutbox/approval_'+input.requestId),{type:'member-approved',memberUid:uid,state:'queued',createdAt:now,attempts:0});
    return result;
  });
});
