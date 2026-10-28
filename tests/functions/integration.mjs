// Synthetic provider only, against the explicitly supplied isolated test schema.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {draftFromAnalysis} from '../../apps/web/src/lib/analysis-contract.ts';
import {readArchive} from '../../apps/web/src/lib/local-archive.ts';
let input='';for await(const c of process.stdin)input+=c;
const configuration=JSON.parse(input);input='';
Object.assign(process.env,configuration.environment);process.env.RECIPE_WRAPPED_RUNTIME='';
const origin=configuration.environment.RECIPE_APP_ORIGIN;
const result={status:'recipe',blocks:[{id:'b1',page:1,text:'SYNTHETISCH Apfelpfanne. 1 Stück Apfel. Apfel schneiden.'}],issues:[],recipe:{title:'SYNTHETISCH Apfelpfanne',titleBlockIds:['b1'],servings:null,servingsRaw:null,servingsBlockIds:[],ingredients:[{amount:'1',unit:'Stück',name:'Apfel',blockIds:['b1']}],equipment:[],steps:[{text:'Apfel schneiden.',blockIds:['b1']}],notes:[],excludedBlocks:[]}};
let simulated=0;
globalThis.recipeChatGPTRuntime={signInUrl:null,signIn:null,error:null,client:{getSession:async()=>({status:'connected',sharing:true,profileId:'synthetic-neon-test'}),listModels:async()=>[{slug:'synthetic-no-provider',displayName:'SYNTHETIC'}],streamResponse:async options=>{assert.equal(options.model,'synthetic-no-provider');assert.equal(options.input[0].content[1].type,'input_image');simulated++;return{text:JSON.stringify(result)};}}};
const {default:api}=await import('../../work/function-local/api/index.mjs');
const {default:worker}=await import('../../work/function-local/worker/index.mjs');
const call=(path,{method='GET',headers={},body}={})=>api.fetch(new Request('https://private-test.example'+path,{method,headers:{origin,...(typeof body==='string'?{'content-length':String(Buffer.byteLength(body))}:{}),...headers},body}));
try{
 assert.equal((await call('/api/collection')).status,401);
 assert.equal((await call('/api/collection',{headers:{'X-Recipe-Session':'forged','x-recipe-owner':'forged'}})).status,401);
 assert.equal((await call('/api/session',{method:'OPTIONS',headers:{origin:'https://evil.example'}})).status,403);
 let response=await call('/api/session?setup=1',{method:'POST',headers:{'content-type':'application/json','x-recipe-setup':configuration.setup},body:JSON.stringify({password:configuration.password})});
 if(response.status===409)response=await call('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:configuration.password})});
 assert.equal(response.status,200);const session=(await response.json()).session,headers={'x-recipe-session':session};
 const id=randomUUID(),token=randomUUID(),bytes=await readFile('tests/fixtures/public/beispiel-vorlage.png');
 function upload(){const form=new FormData();for(const[k,v]of Object.entries({id,token,consent:'true',oneRecipe:'true',model:'synthetic-no-provider'}))form.set(k,v);form.set('file',new File([bytes],'SYNTHETISCH.png',{type:'image/png'}));return call('/api/analysis',{method:'POST',headers,body:form});}
 assert.equal((await upload()).status,202);assert.equal((await upload()).status,202);
 const wake=()=>worker.fetch(new Request('https://worker-test.example/wake',{method:'POST',headers:{'x-recipe-worker':configuration.environment.RECIPE_WORKER_SECRET}}));
 const processing=await Promise.all([wake(),wake()]);assert.ok(processing.every(r=>[200,202].includes(r.status)));assert.equal(simulated,1);
 const job=await call('/api/analysis/'+id,{headers:{...headers,Authorization:'Bearer '+token}});assert.equal(job.status,200);assert.equal((await job.json()).state,'needs_review');
 const draft={...draftFromAnalysis(result),confirmed:true};
 const confirm=async value=>call('/api/analysis/'+id,{method:'POST',headers:{...headers,Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({action:'confirm',draft:value,resolutions:{}})});
 const confirmed=await confirm(draft);assert.equal(confirmed.status,200);const recipe=(await confirmed.json()).recipe;
 assert.deepEqual((await(await confirm({...draft,title:'Manipuliert'})).json()).recipe,recipe);
 const listed=await call('/api/collection',{headers});assert.ok((await listed.json()).recipes.some(r=>r.id===id));
 const archive=await call('/api/collection/'+id,{headers});assert.equal(archive.status,200);const restored=await readArchive(new File([await archive.blob()],'synthetic.json'));
 assert.deepEqual(Buffer.from(await restored[0].sourceBlob.arrayBuffer()),bytes);
 assert.equal((await call('/api/collection/'+id)).status,401);
 console.log(JSON.stringify({functionRouter:true,ownerAuthentication:true,isolatedPostgres:true,deduplicatedUpload:true,separateWorker:true,singleSimulatedRecognition:true,immutableConfirmation:true,archiveSourceBytesEqual:true,realProviderCalls:0}));
}finally{await globalThis.recipePostgres?.pool.end();}
