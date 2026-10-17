// Staged integration module: deliberately not imported by index.html yet.
// Receives Firebase compat SDK separately; never reads legacy APP_CONFIG or vip_ok.
export function createMembershipClient(firebase,config,location=globalThis.location){
  const project=config?.firebase?.projectId,local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  if(!project||project==='krukung-game-hub')throw Error('ต้องตั้งค่า Firebase Project ใหม่สำหรับสมาชิก');
  if(config.mode==='emulator'&&(!local||project!=='demo-game-editor-membership'))throw Error('Emulator ใช้ได้เฉพาะ localhost และ demo project');
  if(!['emulator','production'].includes(config.mode))throw Error('ยังไม่เปิดใช้งานระบบสมาชิก');
  if(config.mode==='production'&&(!config.productionReviewed||project.startsWith('demo-')))throw Error('ยังไม่ได้ตรวจและอนุมัติการเชื่อมระบบสมาชิกจริง');
  if(!firebase.auth||!firebase.functions||!firebase.firestore)throw Error('ยังไม่ได้โหลด SDK ระบบสมาชิกครบ');
  // All SDKs are scoped to this named NEW app, never firebase.app() default.
  const app=firebase.initializeApp(config.firebase,'editor-membership'),auth=app.auth(),db=app.firestore(),functions=app.functions(config.region||'asia-southeast1');
  if(config.mode==='emulator'){
    auth.useEmulator('http://127.0.0.1:9099',{disableWarnings:false});db.useEmulator('127.0.0.1',8080);functions.useEmulator('127.0.0.1',5001);
  }
  const ready=auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  const call=async(name,data={})=>{await ready;return (await functions.httpsCallable(name)(data)).data;};
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
    const profile=await call('registerEditorMember',{facebookName});
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
    async login(email,password){await ready;await auth.signInWithEmailAndPassword(email.trim(),password);return auth.currentUser;},
    async resetPassword(email){
      if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email.trim()))throw Error('กรุณากรอกอีเมลให้ถูกต้อง');
      await ready;await auth.sendPasswordResetEmail(email.trim(),actionSettings);
    },
    async resendVerification(){if(!auth.currentUser)throw Error('กรุณาเข้าสู่ระบบ');await auth.currentUser.sendEmailVerification(actionSettings);},
    async refreshAccess(){if(!auth.currentUser)throw Error('กรุณาเข้าสู่ระบบ');await auth.currentUser.reload();await auth.currentUser.getIdToken(true);return call('getEditorAccess');},
    watchSession(listener){
      if(unsubscribeAuth)throw Error('มีตัวติดตามสมาชิกแล้ว กรุณายกเลิกตัวเดิมก่อน');
      unsubscribeAuth=auth.onIdTokenChanged(async user=>{
        const current=++epoch;unsubscribeMember?.();unsubscribeMember=null;
        listener({allowed:false,state:user?'checking':'signed-out'});
        if(!user)return;
        // A failed or offline status check never opens the tools.
        unsubscribeMember=db.doc('editorMembers/'+user.uid).onSnapshot({includeMetadataChanges:true},async snapshot=>{
          if(current!==epoch)return;
          const currentStatus=++statusEpoch;
          const member=snapshot.data();
          if(snapshot.metadata.fromCache){listener({allowed:false,state:'checking'});return;}
          if(!user.emailVerified){listener({allowed:false,state:'verify-email',member});return;}
          if(!member){listener({allowed:false,state:'profile-required'});return;}
          if(member.status!=='approved'){listener({allowed:false,state:member.status,member});return;}
          try{const access=await call('getEditorAccess');if(current===epoch&&currentStatus===statusEpoch)listener({...access,state:'approved',member});}
          catch{if(current===epoch&&currentStatus===statusEpoch)listener({allowed:false,state:'access-denied',member});}
        },()=>{if(current===epoch){++statusEpoch;listener({allowed:false,state:'unavailable'});}});
      });
      return ()=>{++epoch;unsubscribeMember?.();unsubscribeMember=null;unsubscribeAuth?.();unsubscribeAuth=null;};
    },
    async logout(){++epoch;unsubscribeMember?.();unsubscribeMember=null;await auth.signOut();},
    listMembers:filters=>call('listEditorMembers',filters),
    memberSummary:()=>call('getEditorMemberSummary'),
    memberDetail:uid=>call('getEditorMemberDetail',{uid}),
    changeStatus:({uid,action,revision,requestId=crypto.randomUUID()})=>call('changeEditorMemberStatus',{uid,action,revision,requestId})
  });
}
