// Explicitly run against an isolated Neon branch. No provider calls or real recipes.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PostgresJobs, postgresPool } from "../../apps/web/src/lib/postgres-store.ts";
import { PostgresProfiles, importPostgresBootstrap } from "../../apps/web/src/lib/postgres-profiles.ts";
import { serverEncryption } from "../../apps/web/src/lib/server-encryption.ts";
import { draftFromAnalysis } from "../../apps/web/src/lib/analysis-contract.ts";
import { createArchive, readArchive } from "../../apps/web/src/lib/local-archive.ts";
const { isolatedPostgresInput }=await import("./postgres-test-context.mjs");
process.env.RECIPE_DATABASE_URL=await isolatedPostgresInput();
const pool=await postgresPool(),jobs=new PostgresJobs(pool),key=randomBytes(32).toString("base64url");
try {
  const source=await readFile(new URL("../fixtures/public/beispiel-vorlage.png",import.meta.url));
  const id=randomUUID(),token=randomUUID(),request={id,token,source,name:"SYNTHETISCH.png",mime:"image/png",pages:1,model:"synthetic-no-provider"};
  await Promise.all([jobs.enqueue(request),jobs.enqueue(request)]);
  assert.equal(await jobs.authorize(id,randomUUID()),undefined);
  assert.equal((await jobs.authorize(id,token)).source.length,0);
  assert.deepEqual(Buffer.from((await jobs.authorize(id,token,true)).source),source);
  const claimed=await Promise.all([jobs.claim(100),jobs.claim(100)]);
  assert.equal(claimed.filter(Boolean).length,1);const job=claimed.find(Boolean);assert.equal(job.id,id);
  const result={status:"recipe",blocks:[{id:"b1",page:1,text:"SYNTHETISCH Apfelpfanne. 1 Stück Apfel. Apfel schneiden."}],issues:[],recipe:{title:"SYNTHETISCH Apfelpfanne",titleBlockIds:["b1"],servings:null,servingsRaw:null,servingsBlockIds:[],ingredients:[{amount:"1",unit:"Stück",name:"Apfel",blockIds:["b1"]}],equipment:[],steps:[{text:"Apfel schneiden.",blockIds:["b1"]}],notes:[],excludedBlocks:[]}};
  await jobs.publish(job,result);
  const ready=await jobs.authorize(id,token),draft={...draftFromAnalysis(result),confirmed:true};
  const confirmed=await jobs.confirm(ready,draft,{});
  assert.deepEqual(await jobs.confirm(ready,{...draft,title:"Manipuliert"},{}),confirmed);
  const row=await jobs.confirmedSource(id),archive=await createArchive([{...JSON.parse(row.confirmed),sourceBlob:new Blob([row.source],{type:row.mime})}]);
  const restored=await readArchive(new File([archive],"test.json"));assert.deepEqual(Buffer.from(await restored[0].sourceBlob.arrayBuffer()),source);
  assert.ok((await jobs.listConfirmed()).some(value=>JSON.parse(value).id===id));
  const profiles=new PostgresProfiles(key);
  const saved={version:2,activeProfileId:"synthetic",profiles:[{version:1,id:"synthetic",label:"SYNTHETIC",clientId:"synthetic_client",status:"connected",scopes:["chatgpt.tokens.use.direct"],savedAt:new Date().toISOString(),credentials:{accessToken:"SYNTHETIC-NOT-REAL",expiresAt:Date.now()+600000}}],pendingRegistrations:[]};
  let host;
  await profiles.withLock(async()=>{host=await profiles.getHostId();await profiles.write(saved);});
  const raw=(await pool.query("SELECT encrypted_state FROM rb_chatgpt WHERE id=1")).rows[0].encrypted_state;
  assert.equal(raw.includes(Buffer.from("SYNTHETIC-NOT-REAL")),false);
  // A rotation checkpoint must remain committed even if the enclosing operation fails.
  await assert.rejects(profiles.withLock(async()=>{await profiles.write({...saved,profiles:[{...saved.profiles[0],label:"CHECKPOINT"}]});throw new Error("synthetic verification failure");}));
  const another=new PostgresProfiles(key);
  await another.withLock(async()=>{assert.equal(await another.getHostId(),host);assert.equal((await another.read()).profiles[0].label,"CHECKPOINT");});
  const wrong=new PostgresProfiles(randomBytes(32).toString("base64url"));await assert.rejects(wrong.withLock(()=>wrong.read()),/entschlüsselt/);
  // Existing credentials take precedence over bootstrap and remain untouched.
  const encrypted=Buffer.from(await serverEncryption(key).encrypt(JSON.stringify({kind:"recipe-server-bootstrap-v1",state:saved}))).toString("base64url");
  await importPostgresBootstrap(key,encrypted);
  await profiles.withLock(async()=>assert.equal((await profiles.read()).profiles[0].label,"CHECKPOINT"));
  console.log(JSON.stringify({postgres:true,atomicQueue:true,capabilities:true,immutableConfirmation:true,archiveSourceBytesEqual:true,encryptedProfiles:true,committedCheckpoint:true,stableHost:true,wrongKeyRejected:true,providerCalls:0}));
} finally {await pool.end();}
