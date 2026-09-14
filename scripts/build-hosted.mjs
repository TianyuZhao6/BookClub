import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync,mkdirSync,cpSync } from 'node:fs';
const result=spawnSync('npm',['run','build','--prefix','frontend'],{stdio:'inherit',env:{...process.env,VITE_API_URL:'/api'}});
if(result.status!==0)process.exit(result.status||1);
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/server',{recursive:true});
await build({entryPoints:['hosted/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',conditions:['browser'],external:['node:crypto'],minify:true});
cpSync('frontend/build','dist/client',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
cpSync('.openai/hosting.json','dist/.openai/hosting.json');cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
