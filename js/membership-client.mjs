// Membership app, isolated from the public game catalogue app.
// Receives Firebase compat SDK separately; never reads legacy APP_CONFIG or vip_ok.
export function createMembershipClient(firebase,config,location=globalThis.location){
  const project=config?.firebase?.projectId,local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  if(!project||project==='krukung-game-hub')throw Error('ต้องตั้งค่า Firebase Project ใหม่สำหรับสมาชิก');
  if(config.mode==='production'&&project!=='krukung-game-editor-vip')throw Error('Project สมาชิกไม่ตรงกับที่กำหนด');
  if(config.mode==='emulator'&&(!local||project!=='demo-game-editor-membership'))throw Error('Emulator ใช้ได้เฉพาะ localhost และ demo project');
  if(!['emulator','production'].includes(config.mode))throw Error('ยังไม่เปิดใช้งานระบบสมาชิก');
  if(config.mode==='production'&&(!config.productionReviewed||project.startsWith('demo-')))throw Error('ยังไม่ได้ตรวจและอนุมัติการเชื่อมระบบสมาชิกจริง');
  if(!firebase.auth||!firebase.firestore)throw Error('ยังไม่ได้โหลด SDK ระบบสมาชิกครบ');
  // All SDKs are scoped to this named NEW app, never firebase.app() default.
  const app=firebase.initializeApp(config.firebase,'editor-membership'),auth=app.auth(),db=app.firestore();
  if(config.mode==='emulator'){
    // membership-boot displays an in-flow demo notice instead of Firebase's fixed banner covering mobile controls.
    auth.useEmulator('http://127.0.0.1:9099',{disableWarnings:true});db.useEmulator('127.0.0.1',8080);
  }
  const ready=auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
  const memberRef=uid=>db.doc('editorMembers/'+uid);
  const clean=doc=>{const m=doc.data();return {...m,uid:doc.id,createdAt:m.createdAt?.toDate?.().toISOString()||null,updatedAt:m.updatedAt?.toDate?.().toISOString()||null,approvedAt:m.approvedAt?.toDate?.().toISOString()||null};};
  async function refreshAccess(){
    await ready;if(!auth.currentUser)throw Error('กรุณาเข้าสู่ระบบ');
    // The server evaluates approved+verified+lifetime Rules for this protected document.
    const snapshot=await db.doc('editorAccess/status').get({source:'server'});
    if(!snapshot.exists||snapshot.data().enabled!==true)throw Error('ระบบสมาชิกยังไม่พร้อม');
    return {allowed:true,entitlement:'lifetime'};
  }
  async function checkAdmin(){await ready;if(!auth.currentUser?.emailVerified)throw Error('ไม่มีสิทธิ์แอดมิน');const role=await db.doc('editorAdmins/'+auth.currentUser.uid).get({source:'server'});if(!role.exists||role.data().enabled!==true)throw Error('ไม่มีสิทธิ์แอดมิน');return {allowed:true};}
  async function attestEmail(){const user=auth.currentUser;if(!user?.emailVerified)return;const ref=memberRef(user.uid),snap=await ref.get({source:'server'});if(snap.exists&&snap.data().verifiedEmail!==user.email)await ref.update({verifiedEmail:user.email,updatedAt:stamp()});}
  let unsubscribeMember=null,unsubscribeAuth=null,epoch=0,statusEpoch=0;
  const continueUrl=config.verificationContinueUrl;
  if(!continueUrl||new URL(continueUrl).origin!==location.origin)throw Error('ตั้งค่า URL กลับเว็บไซต์ให้ตรงกับเว็บไซต์นี้');
  const actionSettings={url:continueUrl,handleCodeInApp:false};
  function credentials(email,password){
    if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email.trim()))throw Error('กรุณากรอกอีเมลให้ถูกต้อง');
    if(typeof password!=='string'||password.length<12||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw Error('รหัสผ่านต้องยาว 12–128 ตัวอักษร มีตัวอักษรอังกฤษและตัวเลข');
  }
  async function completeRegistration(facebookName){
    if(!auth.currentUser)throw Error('กรุณาเข้าสู่ระบบก่อน');
    if(typeof facebookName!=='string'||!facebookName.trim()||facebookName.trim().length>120)throw Error('กรุณากรอกชื่อ Facebook ไม่เกิน 120 ตัวอักษร');
    await ready;const user=auth.currentUser,ref=memberRef(user.uid),name=facebookName.trim();
    await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(existing.exists)return;tx.set(ref,{uid:user.uid,email:user.email,emailKey:user.email.toLowerCase(),facebookName:name,facebookKey:name.toLowerCase(),status:'pending',entitlement:null,revision:0,createdAt:stamp(),updatedAt:stamp(),approvedAt:null,approvedBy:null,verifiedEmail:user.emailVerified?user.email:null});});
    const profile=clean(await ref.get({source:'server'}));
    if(!auth.currentUser.emailVerified)await auth.currentUser.sendEmailVerification(actionSettings);
    return profile;
  }
  return Object.freeze({
    async signup({facebookName,email,password,confirmation}){
      credentials(email,password);
      if(typeof facebookName!=='string'||!facebookName.trim()||facebookName.trim().length>120)throw Error('กรุณากรอกชื่อ Facebook ไม่เกิน 120 ตัวอักษร');
      if(password!==confirmation)throw Error('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      await ready;await auth.createUserWithEmailAndPassword(email.trim(),password);
      // If backend/email fails, retain account and expose completeRegistration for safe retry.
      return completeRegistration(facebookName.trim());
    },
    completeRegistration,
    async login(email,password){await ready;await auth.signInWithEmailAndPassword(email.trim(),password);await attestEmail();return auth.currentUser;},
    async resetPassword(email){
      if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email.trim()))throw Error('กรุณากรอกอีเมลให้ถูกต้อง');
      await ready;await auth.sendPasswordResetEmail(email.trim(),actionSettings);
    },
    async resendVerification(){if(!auth.currentUser)throw Error('กรุณาเข้าสู่ระบบ');await auth.currentUser.sendEmailVerification(actionSettings);},
    refreshAccess,
    watchSession(listener){
      if(unsubscribeAuth)throw Error('มีตัวติดตามสมาชิกแล้ว กรุณายกเลิกตัวเดิมก่อน');
      unsubscribeAuth=auth.onIdTokenChanged(async user=>{
        const current=++epoch;unsubscribeMember?.();unsubscribeMember=null;
        const emit=state=>listener({...state,identity:user?{uid:user.uid,email:user.email,emailVerified:user.emailVerified}:null});
        emit({allowed:false,state:user?'checking':'signed-out'});
        if(!user)return;
        // A failed or offline status check never opens the tools.
        unsubscribeMember=db.doc('editorMembers/'+user.uid).onSnapshot({includeMetadataChanges:true},async snapshot=>{
          if(current!==epoch)return;
          const currentStatus=++statusEpoch;
          const member=snapshot.data();
          if(snapshot.metadata.fromCache){emit({allowed:false,state:'checking'});return;}
          if(!user.emailVerified){emit({allowed:false,state:'verify-email',member});return;}
          if(!member){emit({allowed:false,state:'profile-required'});return;}
          if(member.status!=='approved'){emit({allowed:false,state:member.status,member});return;}
          try{const access=await refreshAccess();if(current===epoch&&currentStatus===statusEpoch)emit({...access,state:'approved',member});}
          catch{if(current===epoch&&currentStatus===statusEpoch)emit({allowed:false,state:'access-denied',member});}
        },()=>{if(current===epoch){++statusEpoch;emit({allowed:false,state:'unavailable'});}});
      });
      return ()=>{++epoch;unsubscribeMember?.();unsubscribeMember=null;unsubscribeAuth?.();unsubscribeAuth=null;};
    },
    async logout(){++epoch;unsubscribeMember?.();unsubscribeMember=null;await auth.signOut();},
    async refreshIdentity(){if(!auth.currentUser)throw Error('กรุณาเข้าสู่ระบบ');await auth.currentUser.reload();await auth.currentUser.getIdToken(true);await attestEmail();return {uid:auth.currentUser.uid,emailVerified:auth.currentUser.emailVerified};},
    checkAdmin,
    watchPending(listener,onError){return db.collection('editorMembers').where('status','==','pending').orderBy('createdAt','desc').limit(1).onSnapshot(snapshot=>{if(!snapshot.metadata.fromCache)listener(snapshot.docs[0]?.id||null);},onError);},
    async listMembers({status='',search='',searchBy='facebookName',cursor}={}){
      await ready;let query=db.collection('editorMembers');const key=searchBy==='email'?'emailKey':'facebookKey',term=search.trim().toLowerCase();
      if(status)query=query.where('status','==',status);
      query=query.orderBy(key).orderBy(firebase.firestore.FieldPath.documentId());
      if(term)query=query.startAt(term).endAt(term+'\uf8ff');
      if(cursor)query=query.startAfter(cursor.key,cursor.uid);
      const snap=await query.limit(51).get({source:'server'}),shown=snap.docs.slice(0,50),last=shown.at(-1);
      return {members:shown.map(clean),nextCursor:snap.size>50?{uid:last.id,key:last.data()[key]}:null};
    },
    // Paginated server reads: no billing-enabled service. UI refresh is manual to conserve Spark quota.
    async memberSummary(){await ready;const result={pending:0,approved:0,rejected:0,disabled:0};let last;do{let q=db.collection('editorMembers').orderBy(firebase.firestore.FieldPath.documentId()).limit(100);if(last)q=q.startAfter(last);const snap=await q.get({source:'server'});for(const d of snap.docs){const s=d.data().status;if(s in result)result[s]++;}last=snap.size===100?snap.docs.at(-1):null;}while(last);return result;},
    async memberDetail(uid){return clean(await memberRef(uid).get({source:'server'}));},
    async changeStatus({uid,action,revision,requestId=crypto.randomUUID()}){
      await ready;if(!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))throw Error('รหัสรายการไม่ถูกต้อง');
      return db.runTransaction(async tx=>{const ref=memberRef(uid),audit=db.doc('editorMemberAudit/'+requestId),previous=await tx.get(audit),doc=await tx.get(ref);if(previous.exists){const a=previous.data();if(a.actor!==auth.currentUser.uid||a.uid!==uid||a.revision!==revision+1)throw Error('รหัสรายการซ้ำ');return {uid,status:a.to};}if(!doc.exists||doc.data().revision!==revision)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่');
        const m=doc.data(),to=({approve:'approved',reject:'rejected',disable:'disabled',restore:'approved'})[action];
        if(!to||(action==='approve'&&!['pending','rejected'].includes(m.status))||(action==='reject'&&m.status!=='pending')||(action==='disable'&&m.status!=='approved')||(action==='restore'&&m.status!=='disabled'))throw Error('ไม่สามารถเปลี่ยนสถานะนี้ได้');
        const update={status:to,entitlement:to==='approved'?'lifetime':null,revision:revision+1,updatedAt:stamp(),lastOperationId:requestId};if(to==='approved')Object.assign(update,{approvedAt:stamp(),approvedBy:auth.currentUser.uid});
        tx.update(ref,update);tx.set(audit,{actor:auth.currentUser.uid,uid,from:m.status,to,revision:revision+1,createdAt:stamp()});return {uid,...update};});
    }
  });
}
