// Isolated synthetic Neon branch + Chrome virtual authenticator. No biometrics/provider calls.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { randomBytes, scryptSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
let input=''; for await (const chunk of process.stdin) input+=chunk;
const configuration=JSON.parse(input); input='';
const connection=new URL(configuration.environment.RECIPE_DATABASE_URL);
assert.match(connection.hostname,/^ep-shy-tooth-/); assert.match(connection.searchParams.get('options'),/search_path=recipe_preview_20261028$/);
Object.assign(process.env,configuration.environment); process.env.RECIPE_WRAPPED_RUNTIME='';
const {default:api}=await import('../../work/function-local/api/index.mjs');
const origin=configuration.environment.RECIPE_APP_ORIGIN, backend='https://br-synthetic-passkey.compute.test.neon.tech', base=origin+'/digitales-rezeptbuch/';
const call=(path,body,headers={})=>api.fetch(new Request(backend+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)}));
const browser=await chromium.launch({channel:'chrome',headless:true}); let savedOwner, pool, keyId;
try {
  assert.equal((await call('/api/passkey',{action:'register-options'})).status,401);
  // Initialize additive migration, then use only this explicitly isolated fake owner's short code.
  const first=await call('/api/session?setup=1',{password:'654321'},{'x-recipe-setup':configuration.setup});
  assert.ok([200,409].includes(first.status)); pool=globalThis.recipePostgres.pool;
  savedOwner=(await pool.query('SELECT salt,password_hash FROM rb_owner WHERE id=1')).rows[0];
  const salt=randomBytes(32).toString('hex');
  await pool.query('UPDATE rb_owner SET salt=$1,password_hash=$2 WHERE id=1',[salt,scryptSync('654321',salt,64).toString('hex')]);
  // Expire only synthetic login budgets from earlier test runs.
  await pool.query('DELETE FROM rb_auth_limits');
  assert.equal((await call('/api/session',{password:''})).status,422);
  assert.equal((await call('/api/session',{password:'wrong'})).status,401);
  const authenticated=await call('/api/session',{password:'654321'}); assert.equal(authenticated.status,200);
  const headers={'x-recipe-session':(await authenticated.json()).session};
  const context=await browser.newContext({viewport:{width:390,height:950},serviceWorkers:'block'}), page=await context.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  const root=resolve('dist/pages');
  await context.route(base+'**',async route=>{
    const path=new URL(route.request().url()).pathname.replace('/digitales-rezeptbuch/',''),file=resolve(root,path||'index.html');
    if(!file.startsWith(root+'\\'))return route.abort();
    const contentType={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[extname(file)]??'application/octet-stream';
    try {await route.fulfill({status:200,contentType,body:await readFile(file)});} catch {await route.fulfill({status:404,body:'not found'});}
  });
  let lastRegistration, lastLogin;
  await context.route(backend+'/**',async route=>{
    const req=route.request(), data=req.postData();
    if(data){const parsed=JSON.parse(data);if(parsed.action==='register-verify')lastRegistration=parsed;if(parsed.action==='login-verify')lastLogin=parsed;}
    const response=await api.fetch(new Request(req.url(),{method:req.method(),headers:req.headers(),...(data?{body:data}:{})}));
    await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  });
  const cdp=await context.newCDPSession(page); await cdp.send('WebAuthn.enable');
  const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
  await page.goto(base+'#setup='+configuration.setup);
  const password=page.getByLabel('Dein Code oder Passwort',{exact:true}); await password.waitFor();
  assert.equal(await password.getAttribute('minlength'),null);
  await page.getByText('Zum Beispiel ein 6-stelliger Code. Keine Mindestlänge oder Zeichenregeln.').waitFor();
  // Existing fake owner: use the ordinary login screen, not a new owner setup.
  await page.goto(base+'?synthetic-passkey-check=1');
  await page.getByLabel('Dein Code oder Passwort',{exact:true}).fill('654321');
  await page.getByRole('button',{name:'Mit Code oder Passwort öffnen',exact:true}).click();
  await page.getByText('Privates Rezeptbuch verbunden',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Face ID / Passkey einrichten',exact:true}).click();
  await page.getByText(/Passkey eingerichtet\./).waitFor();
  keyId=lastRegistration.credential.id;
  assert.equal((await call('/api/passkey',lastRegistration,headers)).status,422); // Single-use challenge.
  await page.getByRole('button',{name:'Dieses Gerät abmelden',exact:true}).click();
  await page.getByRole('button',{name:'Mit Face ID / Passkey öffnen',exact:true}).click();
  await page.getByText('Privates Rezeptbuch verbunden',{exact:true}).waitFor();
  assert.equal((await call('/api/passkey',lastLogin)).status,422);
  const tamperedOptions=await(await call('/api/passkey',{action:'login-options'})).json();
  assert.equal((await call('/api/passkey',{...lastLogin,challengeId:tamperedOptions.challengeId})).status,422);
  // No UV: a credential signature without device verification must not log in.
  await cdp.send('WebAuthn.setUserVerified',{authenticatorId,isUserVerified:false});
  const noUv=await(await call('/api/passkey',{action:'login-options'})).json();
  // A fresh signed assertion is requested with UV discouraged only in this developer test.
  const invalid=await page.evaluate(async options=>{
    const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    const encode=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const c=await navigator.credentials.get({publicKey:{...options,challenge:decode(options.challenge),userVerification:'discouraged'}});
    return {id:c.id,rawId:encode(c.rawId),type:c.type,response:{authenticatorData:encode(c.response.authenticatorData),clientDataJSON:encode(c.response.clientDataJSON),signature:encode(c.response.signature),userHandle:c.response.userHandle?encode(c.response.userHandle):null},clientExtensionResults:c.getClientExtensionResults()};
  },noUv.options);
  assert.equal((await call('/api/passkey',{action:'login-verify',challengeId:noUv.challengeId,credential:invalid})).status,422);
  // Explicitly simulate closing the device prompt: existing session remains usable.
  await page.getByRole('button',{name:'Dieses Gerät abmelden',exact:true}).click();
  await cdp.send('WebAuthn.removeVirtualAuthenticator',{authenticatorId});
  await page.evaluate(()=>{navigator.credentials.get=async()=>{throw new DOMException('synthetic cancellation','NotAllowedError');};});
  await page.getByRole('button',{name:'Mit Face ID / Passkey öffnen',exact:true}).click();
  await page.getByRole('alert').filter({hasText:/abgebrochen/}).waitFor();
  await page.screenshot({path:'work/passkey-mobile-390.png',fullPage:false});
  assert.deepEqual(errors,[]);
  // Minute budget protects the code. Passkey budget stays available separately.
  let limited; for(let i=0;i<6;i++) limited=await call('/api/session',{password:'wrong'});
  assert.equal(limited.status,429);
  assert.equal((await call('/api/passkey',{action:'login-options'})).status,200);
  console.log(JSON.stringify({sixDigitCode:true,noMinimumLength:true,virtualPasskeyRegistration:true,virtualPasskeyLogin:true,replayRejected:true,challengeMismatchRejected:true,missingUserVerificationRejected:true,cancellationRecoverable:true,codeRateLimit:true,passkeyBudgetIndependent:true,mobileWidth390:true,browserErrors:0,realFaceIDTest:false,providerCalls:0}));
} finally {
  await browser.close();
  if(pool){if(keyId)await pool.query('DELETE FROM rb_passkeys WHERE id=$1',[keyId]);if(savedOwner)await pool.query('UPDATE rb_owner SET salt=$1,password_hash=$2 WHERE id=1',[savedOwner.salt,savedOwner.password_hash]);await pool.query('DELETE FROM rb_auth_limits');await pool.end();}
}
