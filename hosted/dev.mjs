import { createServer as httpServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { createServer as viteServer } from '../frontend/node_modules/vite/dist/node/index.js';
import { localDatabase } from './local-db.js';
import worker from './worker.js';
const args=process.argv.slice(2); const value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const port=Number(value('--port',process.env.PORT||4173));
mkdirSync('.sites-runtime',{recursive:true});
const DB=localDatabase('.sites-runtime/bookclub.sqlite');
process.env.VITE_API_URL='/api';
let vite;
const server=httpServer(async(req,res)=>{
 if(!req.url.startsWith('/api/'))return vite.middlewares(req,res);
 try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
   const request=new Request('http://terminal.local'+req.url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
   const response=await worker.fetch(request,{DB,GOOGLE_API_KEY:process.env.GOOGLE_API_KEY});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Request failed'}));}
});
vite=await viteServer({root:new URL('../frontend',import.meta.url).pathname,server:{middlewareMode:true,allowedHosts:['terminal.local'],hmr:{server,clientPort:port}},appType:'spa'});
server.listen(port,value('--host','0.0.0.0'),()=>console.log(`BookClub ready at http://localhost:${port}`));
const close=()=>server.close(async()=>{await vite.close();DB.close();process.exit(0);});
process.on('SIGTERM',close);process.on('SIGINT',close);
