import { spawn } from "node:child_process";
import { request } from "node:http";
import { randomBytes,randomUUID } from "node:crypto";
import { mkdir,mkdtemp,readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createPrivateGateway } from "../../scripts/private-gateway.mjs";
import { openJobs,claimJob,publishResult } from "../../apps/web/src/lib/analysis-server.ts";
import { draftFromAnalysis } from "../../apps/web/src/lib/analysis-contract.ts";
import { readArchive } from "../../apps/web/src/lib/local-archive.ts";
const root=resolve(import.meta.dirname,"../..");
await mkdir("work",{recursive:true});const directory=await mkdtemp(resolve("work/private-integration-"));
const internalToken=randomBytes(32).toString("base64url"),password="synthetic-integration-password-only",origin="https://recipe.example",targetPort=3135;
const env={...process.env,ANALYSIS_AUTH_MODE:"api",LOCAL_ANALYSIS_ENABLED:"true",OPENAI_API_KEY:"synthetic-no-provider",OPENAI_MODEL:"synthetic-model",RECIPE_PRIVATE_SERVER:"true",RECIPE_INTERNAL_TOKEN:internalToken,RECIPE_DATA_DIR:directory};
const web=spawn(process.execPath,[resolve(root,"node_modules/next/dist/bin/next"),"start","--hostname","127.0.0.1","--port",String(targetPort)],{cwd:resolve(root,"apps/web"),env,stdio:["ignore","pipe","pipe"],windowsHide:true});
let logs="";web.stdout.on("data",chunk=>logs+=chunk);web.stderr.on("data",chunk=>logs+=chunk);
const gateway=createPrivateGateway({origin,password,sessionKey:randomBytes(32).toString("base64url"),internalToken,targetPort});
function send(path,{method="GET",headers={},body=Buffer.alloc(0)}={}){return new Promise((done,reject)=>{const req=request({host:"127.0.0.1",port:gateway.address().port,path,method,headers:{host:"recipe.example",...(body.length?{"content-length":String(body.length)}:{}),...headers}},res=>{const chunks=[];res.on("data",chunk=>chunks.push(chunk));res.on("end",()=>done({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on("error",reject);req.end(body);});}
try{
  let ready=false;for(let i=0;i<40;i++){try{if((await fetch(`http://127.0.0.1:${targetPort}`)).ok){ready=true;break;}}catch{}await new Promise(done=>setTimeout(done,250));}if(!ready)throw new Error("Testserver nicht bereit: "+logs);
  await new Promise(done=>gateway.listen(0,"127.0.0.1",done));
  assert.equal((await send("/api/collection")).status,401);
  const login=await send("/_zugang",{method:"POST",headers:{origin,"content-type":"application/x-www-form-urlencoded"},body:Buffer.from(new URLSearchParams({password}).toString())});assert.equal(login.status,303);
  const cookie=login.headers["set-cookie"][0].split(";")[0],headers={cookie,origin};
  const config=JSON.parse((await send("/api/analysis",{headers})).body);assert.equal(config.syncEnabled,true);
  const id=randomUUID(),token=randomUUID(),source=await readFile("tests/fixtures/public/beispiel-vorlage.png");
  const form=new FormData();for(const[k,v]of Object.entries({id,token,consent:"true",oneRecipe:"true"}))form.set(k,v);form.set("file",new File([source],"synthetisch.png",{type:"image/png"}));
  const encoded=new Request(origin+"/api/analysis",{method:"POST",body:form});
  const uploaded=await send("/api/analysis",{method:"POST",headers:{...headers,"content-type":encoded.headers.get("content-type")},body:Buffer.from(await encoded.arrayBuffer())});assert.equal(uploaded.status,202,uploaded.body.toString());
  const result={status:"recipe",blocks:[{id:"b1",page:1,text:"Synthetische Apfelpfanne. 1 Stück Apfel. Apfel schneiden."}],issues:[],recipe:{title:"Synthetische Apfelpfanne",titleBlockIds:["b1"],servings:null,servingsRaw:null,servingsBlockIds:[],ingredients:[{amount:"1",unit:"Stück",name:"Apfel",blockIds:["b1"]}],equipment:[],steps:[{text:"Apfel schneiden.",blockIds:["b1"]}],notes:[],excludedBlocks:[]}};
  const db=openJobs(resolve(directory,"analysis.sqlite"));try{const job=claimJob(db,100);assert.equal(job.id,id);publishResult(db,job,result);}finally{db.close();}
  const draft={...draftFromAnalysis(result),confirmed:true};
  const saved=await send(`/api/analysis/${id}`,{method:"POST",headers:{...headers,authorization:`Bearer ${token}`,"content-type":"application/json"},body:Buffer.from(JSON.stringify({action:"confirm",draft,resolutions:{}}))});assert.equal(saved.status,200,saved.body.toString());
  const listed=JSON.parse((await send("/api/collection",{headers})).body);assert.equal(listed.recipes.length,1);assert.equal(listed.recipes[0].id,id);
  const archived=await send(`/api/collection/${id}`,{headers});assert.equal(archived.status,200);
  const restored=await readArchive(new File([archived.body],"server.json"));assert.equal(restored[0].title,draft.title);assert.deepEqual(Buffer.from(await restored[0].sourceBlob.arrayBuffer()),source);
  assert.equal((await send(`/api/collection/${id}`)).status,401);
  console.log(JSON.stringify({privateGateway:true,realProductionServer:true,syntheticJobConfirmed:true,secondDeviceArchiveVerified:true,sourceBytesEqual:true,providerCalls:0}));
}finally{gateway.closeAllConnections();await new Promise(done=>gateway.close(done));web.kill();}
