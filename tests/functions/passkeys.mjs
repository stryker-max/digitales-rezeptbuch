// Real WebAuthn signatures with a developer virtual authenticator, on synthetic data only.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {privateHost} from '../../apps/web/src/lib/private-host.ts';
let input='';for await(const chunk of process.stdin)input+=chunk;const config=JSON.parse(input);input='';
const url=new URL(config.environment.RECIPE_DATABASE_URL);assert.match(url.hostname,/^ep-shy-tooth-/);assert.match(url.searchParams.get('options'),/search_path=recipe_preview_20261028$/);
Object.assign(process.env,config.environment);process.env.RECIPE_WRAPPED_RUNTIME='';
const {default:api}=await import('../../work/function-local/api/index.mjs');
const origin=config.environment.RECIPE_APP_ORIGIN,session=privateHost(config.environment.RECIPE_SESSION_KEY,origin).issue();
const call=(body,token='')=>api.fetch(new Request('https://synthetic.example/api/passkey',{method:'POST',headers:{origin,'content-type':'application/json',...(token?{'x-recipe-session':token}:{})},body:JSON.stringify(body)}));
const browser=await chromium.launch({channel:'chrome',headless:true});let keyId;
try{
 assert.equal((await call({action:'register-options'})).status,401);
 const options=await(await call({action:'register-options'},session)).json();const pool=globalThis.recipePostgres.pool;
 await pool.query('DELETE FROM rb_auth_limits');
 const context=await browser.newContext();await context.route(origin+'/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>SYNTHETIC Passkey</title>'}));const page=await context.newPage();await page.goto(origin+'/synthetic');
 const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 const credential=await page.evaluate(async options=>{
  const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));const encode=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const c=await navigator.credentials.create({publicKey:{...options,challenge:decode(options.challenge),user:{...options.user,id:decode(options.user.id)},excludeCredentials:options.excludeCredentials?.map(item=>({...item,id:decode(item.id)}))}});
  return{id:c.id,rawId:encode(c.rawId),type:c.type,response:{clientDataJSON:encode(c.response.clientDataJSON),attestationObject:encode(c.response.attestationObject),transports:c.response.getTransports()},clientExtensionResults:c.getClientExtensionResults(),authenticatorAttachment:c.authenticatorAttachment};
 },options.options); // The endpoint returns {challengeId, options}.
 const registration={action:'register-verify',challengeId:options.challengeId,credential};keyId=credential.id;
 const other=privateHost(config.environment.RECIPE_SESSION_KEY,origin).issue();assert.equal((await call(registration,other)).status,422);assert.equal((await call(registration,session)).status,200);assert.equal((await call(registration,session)).status,422);
 async function assertion(options,uv='required'){return page.evaluate(async({options,uv})=>{const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));const encode=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const c=await navigator.credentials.get({publicKey:{...options,challenge:decode(options.challenge),userVerification:uv}});return{id:c.id,rawId:encode(c.rawId),type:c.type,response:{authenticatorData:encode(c.response.authenticatorData),clientDataJSON:encode(c.response.clientDataJSON),signature:encode(c.response.signature),userHandle:c.response.userHandle?encode(c.response.userHandle):null},clientExtensionResults:c.getClientExtensionResults()};},{options,uv});}
 const login=await(await call({action:'login-options'})).json(),response=await assertion(login.options),body={action:'login-verify',challengeId:login.challengeId,credential:response};assert.equal((await call(body)).status,200);assert.equal((await call(body)).status,422);
 const mismatch=await(await call({action:'login-options'})).json();assert.equal((await call({...body,challengeId:mismatch.challengeId})).status,422);
 await cdp.send('WebAuthn.setUserVerified',{authenticatorId,isUserVerified:false});const noUv=await(await call({action:'login-options'})).json();assert.equal((await call({action:'login-verify',challengeId:noUv.challengeId,credential:await assertion(noUv.options,'discouraged')})).status,422);
 console.log(JSON.stringify({virtualPasskeyRegistration:true,virtualPasskeyLogin:true,sessionBinding:true,replayRejected:true,challengeMismatchRejected:true,missingUserVerificationRejected:true,realFaceID:false,providerCalls:0}));
}finally{await browser.close();if(globalThis.recipePostgres){const pool=globalThis.recipePostgres.pool;if(keyId)await pool.query('DELETE FROM rb_passkeys WHERE id=$1',[keyId]);await pool.query('DELETE FROM rb_auth_limits');await pool.end();}}
