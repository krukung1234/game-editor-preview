'use strict';
// Development only, loopback only. Never deploy this as an authenticated file server.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const pages=new Set(['index.html','editor.html','game-player.html','personal-game-player.html','shared-game-player.html','membership-admin.html']);
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',wasm:'application/wasm',woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',mp3:'audio/mpeg',wav:'audio/wav'};
const server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 if(!['127.0.0.1:8085','localhost:8085'].includes(req.headers.host)){res.writeHead(403);res.end();return;}
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://127.0.0.1:8085').pathname).slice(1)||'index.html';}catch{res.writeHead(400);res.end();return;}
 const full=path.resolve(root,rel),allowed=(pages.has(rel)||/^(js|css|images|games|editor-assets)\//.test(rel))&&!['js/config.js','js/admin.js'].includes(rel);
 if(!allowed||!full.startsWith(root+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[full.split('.').at(-1).toLowerCase()]||'application/octet-stream');if(req.method==='HEAD'){res.end();return;}fs.createReadStream(full).on('error',()=>res.destroy()).pipe(res);
});
server.on('error',()=>{console.error('Cannot start preview. Check port 8085.');process.exitCode=1;});
server.listen(8085,'127.0.0.1',()=>console.log('Local demo only: http://127.0.0.1:8085 — start demo Firebase emulators separately; Ctrl+C to stop.'));
