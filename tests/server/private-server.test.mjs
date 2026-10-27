import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createPrivateGateway } from "../../scripts/private-gateway.mjs";
import { importServerBootstrap } from "../../scripts/server-bootstrap.mjs";
import { serverEncryption } from "../../apps/web/src/lib/server-encryption.ts";
import { ConnectionStore } from "../../packages/chatgpt-local/dist/storage.js";

const listen = server => new Promise(done => server.listen(0, "127.0.0.1", done));
const close = server => new Promise(done => { server.closeAllConnections(); server.close(done); });
function send(port, path, { method="GET", headers={}, body="" }={}) {
  return new Promise((done, reject) => {
    const req = request({ host:"127.0.0.1", port, path, method, headers:{ host:"recipe.example", ...headers } }, response => {
      let text=""; response.setEncoding("utf8"); response.on("data", chunk=>text+=chunk); response.on("end",()=>done({ status:response.statusCode, headers:response.headers, text }));
    }); req.on("error",reject); req.end(body);
  });
}
test("private gateway protects pages, API and sources, and prevents cross-origin writes/header forgery", async () => {
  let calls=0;
  const upstream=createServer((req,res)=>{ calls++; res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({ origin:req.headers.origin, authorization:req.headers.authorization, owner:req.headers["x-recipe-owner"], forwarded:req.headers["x-forwarded-host"] })); });
  await listen(upstream);
  const internalToken=randomBytes(32).toString("base64url"), password="synthetic-private-password-only";
  const gateway=createPrivateGateway({ origin:"https://recipe.example",password,sessionKey:randomBytes(32).toString("base64url"),internalToken,targetPort:upstream.address().port });
  await listen(gateway); const port=gateway.address().port;
  try {
    assert.match((await send(port,"/")).text,/Persönliches Passwort/);
    assert.equal((await send(port,"/api/analysis")).status,401);
    assert.equal((await send(port,"/api/analysis/test?source=1",{headers:{"x-recipe-owner":internalToken}})).status,401);
    assert.equal((await send(port,"/",{headers:{host:"foreign.example"}})).status,403);
    assert.equal(calls,0);
    const login={method:"POST",headers:{origin:"https://recipe.example","content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({password}).toString()};
    assert.equal((await send(port,"/_zugang",{...login,headers:{...login.headers,origin:"https://foreign.example"}})).status,403);
    const logged=await send(port,"/_zugang",login); assert.equal(logged.status,303);
    const cookie=logged.headers["set-cookie"][0]; assert.match(cookie,/Secure/);assert.match(cookie,/HttpOnly/);
    const headers={cookie:cookie.split(";")[0],origin:"https://recipe.example",authorization:"Bearer synthetic-job-capability","x-forwarded-host":"foreign.example","x-recipe-owner":"forged"};
    assert.equal((await send(port,"/api/analysis",{method:"POST",headers:{...headers,origin:"https://foreign.example"}})).status,403);
    assert.equal(calls,0);
    const valid=await send(port,"/api/analysis",{method:"POST",headers,body:"synthetic"}); assert.equal(valid.status,200);
    const result=JSON.parse(valid.text); assert.equal(result.owner,internalToken); assert.equal(result.forwarded,undefined); assert.equal(result.authorization,"Bearer synthetic-job-capability"); assert.equal(result.origin,`http://127.0.0.1:${upstream.address().port}`);
    assert.equal((await send(port,"/api/analysis",{headers:{cookie:"__Host-rezeptbuch=forged"}})).status,401);
  } finally { await close(gateway); await close(upstream); }
});
test("server bootstrap imports encrypted credentials once, preserves its host and refuses a wrong key", async () => {
  await mkdir("work",{recursive:true}); const directory=await mkdtemp(resolve("work/server-bootstrap-test-"));
  const key=randomBytes(32).toString("base64url"), encryption=serverEncryption(key);
  const profile={id:"synthetic-profile",label:"Synthetic",version:1,clientId:"synthetic-client",status:"connected",scopes:["chatgpt.tokens.use.direct"],savedAt:new Date().toISOString(),credentials:{accessToken:"synthetic-not-real",refreshToken:"synthetic-not-real",expiresAt:Date.now()+3600000}};
  const state={version:2,activeProfileId:profile.id,profiles:[profile],pendingRegistrations:[]};
  const encrypted=Buffer.from(await encryption.encrypt(JSON.stringify({kind:"recipe-server-bootstrap-v1",state}))).toString("base64url");
  try {
    await importServerBootstrap(directory,key,encrypted);
    const store=new ConnectionStore(directory,encryption);
    const first=await store.withLock(async()=>({host:await store.getHostId(),saved:await store.read()}));
    assert.equal(first.saved.activeProfileId,profile.id);
    await importServerBootstrap(directory,key,"invalid-bootstrap-is-ignored-after-import");
    const second=await store.withLock(async()=>({host:await store.getHostId(),saved:await store.read()}));
    assert.deepEqual(second,first);
    await assert.rejects(importServerBootstrap(directory,randomBytes(32).toString("base64url"),encrypted));
    assert.deepEqual(await store.withLock(()=>store.read()),state);
  } finally { assert.ok(directory.startsWith(resolve("work")+sep)); await rm(directory,{recursive:true,force:true}); }
});
