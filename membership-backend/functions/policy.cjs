'use strict';
class PolicyError extends Error {
  constructor(code,message){super(message);this.code=code;}
}
const fail=(code,message)=>{throw new PolicyError(code,message);};
function assertProject(project,expected,emulator){
  if(!project||project==='krukung-game-hub'||project!==expected)fail('failed-precondition','ระบบสมาชิกไม่ได้ตั้งค่า Project ใหม่ที่ถูกต้อง');
  if(emulator&&!project.startsWith('demo-'))fail('failed-precondition','Emulator ต้องใช้ demo project เท่านั้น');
}
function signedIn(auth){
  if(!auth?.uid||!auth.token?.email)fail('unauthenticated','กรุณาเข้าสู่ระบบด้วยอีเมล');
  return auth.uid;
}
function verified(auth){signedIn(auth);if(auth.token.email_verified!==true)fail('permission-denied','กรุณายืนยันอีเมลก่อน');}
function administrator(auth,user){
  verified(auth);
  if(user?.disabled||!user?.emailVerified||user?.customClaims?.editorAdmin!==true)fail('permission-denied','บัญชีนี้ไม่มีสิทธิ์จัดการสมาชิก');
}
function profileInput(data){
  if(!data||Object.keys(data).some(k=>k!=='facebookName'))fail('invalid-argument','ส่งได้เฉพาะชื่อ Facebook');
  const facebookName=typeof data.facebookName==='string'?data.facebookName.trim().normalize('NFC'):'';
  if(!facebookName||facebookName.length>120||/[\u0000-\u001f\u007f]/.test(facebookName))fail('invalid-argument','กรุณากรอกชื่อ Facebook ไม่เกิน 120 ตัวอักษร');
  return {facebookName,facebookKey:facebookName.toLocaleLowerCase('th')};
}
const transitions={approve:{from:['pending','rejected'],to:'approved'},reject:{from:['pending'],to:'rejected'},disable:{from:['approved'],to:'disabled'},restore:{from:['disabled'],to:'approved'}};
function statusChange(input,current,actor,target){
  if(!input||Object.keys(input).some(k=>!['uid','action','revision','requestId'].includes(k)))fail('invalid-argument','ข้อมูลคำสั่งไม่ถูกต้อง');
  const rule=Object.hasOwn(transitions,input.action)?transitions[input.action]:null;
  if(!rule||typeof target!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(target)||!/^[-A-Za-z0-9_]{16,80}$/.test(input.requestId||'')||!Number.isSafeInteger(input.revision)||input.revision<0)fail('invalid-argument','ข้อมูลคำสั่งไม่ถูกต้อง');
  if(actor===target)fail('permission-denied','ไม่สามารถเปลี่ยนสิทธิ์สมาชิกของตนเอง');
  if(!current)fail('not-found','ไม่พบสมาชิก');
  if(current.revision!==input.revision)fail('aborted','ข้อมูลเปลี่ยนแล้ว กรุณาโหลดรายการใหม่');
  if(!rule.from.includes(current.status))fail('failed-precondition','ไม่สามารถเปลี่ยนจากสถานะปัจจุบันด้วยคำสั่งนี้');
  return {status:rule.to,entitlement:rule.to==='approved'?'lifetime':null,revision:current.revision+1};
}
function eligible(auth,user,member){
  verified(auth);
  if(user?.disabled||!user?.emailVerified||member?.status!=='approved'||member?.entitlement!=='lifetime')fail('permission-denied','บัญชียังไม่ได้รับสิทธิ์ VIP หรือสิทธิ์ถูกระงับ');
  return true;
}
module.exports={PolicyError,fail,assertProject,signedIn,verified,administrator,profileInput,statusChange,eligible};
