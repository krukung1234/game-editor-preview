'use strict';
// Local test utility only. Tailscale Serve authenticates the proxy header.
// Bind loopback; never expose this backend directly on LAN/0.0.0.0.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const GAME='ar-words-english';
function createServer({root,login}){
 if(!login||!login.trim()||/[\r\n]/.test(login))throw Error('Set AR_ANDROID_TEST_LOGIN to your own Tailscale login. No password required.');
 const owner=login.trim().toLowerCase(),gameRoot=fs.realpathSync(path.join(root,'games',GAME));
 const files=new Map([['/',{file:'index.html',mime:'text/html; charset=utf-8'}],['/index.html',{file:'index.html',mime:'text/html; charset=utf-8'}],['/cover.png',{file:'cover.png',mime:'image/png'}]]);
 return http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  // Public Funnel requests have no Tailscale identity headers. Deny them too.
  if(String(req.headers['tailscale-user-login']||'').trim().toLowerCase()!==owner){res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Private test: open through your own Tailscale Serve connection.');}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
  let pathname;try{pathname=decodeURIComponent((req.url||'').split('?')[0]);}catch{res.writeHead(400);return res.end();}
  if(pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
  const entry=files.get(pathname);
  if(!entry){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not available in this one-game test.');}
  const file=fs.realpathSync(path.join(gameRoot,entry.file));if(!file.startsWith(gameRoot+path.sep)){res.writeHead(403);return res.end();}
  res.writeHead(200,{'Content-Type':entry.mime});if(req.method==='HEAD')return res.end();fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 });
}
if(require.main===module){
 const root=path.resolve(__dirname,'..');
 const branch=cp.execFileSync('git',['-C',root,'branch','--show-current'],{encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trim();
 if(branch!=='test-v21-spark')throw Error('Switch to test-v21-spark before starting.');
 const html=fs.readFileSync(path.join(root,'games',GAME,'index.html'),'utf8').replace(/^\uFEFF/,'').replaceAll('\r\n','\n');
 const blueprint=JSON.parse(fs.readFileSync(path.join(root,'js/adapters/native/native-23.json'),'utf8'));
 if(blueprint.folder!==GAME||crypto.createHash('sha256').update(html).digest('hex')!==blueprint.sourceHash)throw Error('Original game hash differs from audited adapter. Recheck before testing.');
 const server=createServer({root,login:process.env.AR_ANDROID_TEST_LOGIN});
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port 8096 is already in use. Do not proxy a different service.':'Unable to start private one-game test.');process.exitCode=1;});
 server.listen(8096,'127.0.0.1',()=>console.log('One-game backend ready on 127.0.0.1:8096. Identity required; Admin/member routes unavailable. Ctrl+C stops it.'));
 const stop=()=>server.close(()=>process.exit(0));process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
module.exports={createServer,GAME};
