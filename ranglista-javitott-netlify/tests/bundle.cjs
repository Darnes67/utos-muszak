const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ranking-bundle-'));
try{
 for(const file of ['engine.cjs','game-source.cjs'])fs.copyFileSync(path.join(root,'server',file),path.join(temp,file));
 fs.copyFileSync(path.join(__dirname,'fixture.json'),path.join(temp,'fixture.json'));
 const result=cp.spawnSync(process.execPath,['-e',`const assert=require('node:assert');const e=require('./engine.cjs'),f=require('./fixture.json');const r=e.verifyRound({kind:'sprint',map:0,tool:0,character:0,seed:740},f.events,5400);assert.equal(r.points,f.metrics.points);console.log('PASS: complete round verified without index.html or source directory.');`],{cwd:temp,encoding:'utf8',timeout:20000});
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.error)throw result.error;if(result.status)process.exitCode=result.status;
}finally{fs.rmSync(temp,{recursive:true,force:true});}
