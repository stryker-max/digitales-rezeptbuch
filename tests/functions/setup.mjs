// First-owner setup, using ONLY the approved synthetic Neon branch and fake code.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
let input=''; for await(const chunk of process.stdin)input+=chunk;
const config=JSON.parse(input);input='';
const connection=new URL(config.environment.RECIPE_DATABASE_URL);
assert.match(connection.hostname,/^ep-shy-tooth-/);assert.match(connection.searchParams.get('options'),/search_path=recipe_preview_20261028$/);
Object.assign(process.env,config.environment);process.env.RECIPE_WRAPPED_RUNTIME='';
const {default:localApi}=await import('../../work/function-local/api/index.mjs');
if(config.hostedApi)assert.equal(config.hostedApi,'https://br-late-water-b9237cy9-recipeapi.compute.c-7.eu-central-1.aws.neon.tech');
const api=config.hostedApi?{fetch:async request=>{
  const url=new URL(request.url),headers=new Headers(request.headers);headers.delete('host');headers.delete('content-length');
  return fetch(config.hostedApi+url.pathname+url.search,{method:request.method,headers,...(request.body?{body:Buffer.from(await request.arrayBuffer())}:{}),redirect:'error'});
}}:localApi;
const origin=config.environment.RECIPE_APP_ORIGIN, base=origin+'/digitales-rezeptbuch/', backend='https://br-synthetic-passkey.compute.test.neon.tech';
const send=(body,{setup=false,capability=config.setup,method='POST'}={})=>api.fetch(new Request(backend+'/api/session'+(setup?'?setup=1':''),{method,headers:{origin,'content-type':'application/json',...(setup?{'x-recipe-setup':capability}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{})}));
await send(undefined,{method:'GET'});
const pool=config.hostedApi?await(await import('../../apps/web/src/lib/postgres-store.ts')).postgresPool():globalThis.recipePostgres.pool, savedOwner=(await pool.query('SELECT salt,password_hash FROM rb_owner WHERE id=1')).rows[0];
const jobsBefore=Number((await pool.query('SELECT COUNT(*) AS count FROM rb_jobs')).rows[0].count);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  // Temporarily remove only the fake test owner; restored in finally. Never production.
  await pool.query('DELETE FROM rb_owner WHERE id=1');await pool.query('DELETE FROM rb_auth_limits');
  assert.deepEqual(await(await send(undefined,{method:'GET'})).json(),{configured:false});
  const missing=await send({password:'654321'});assert.equal(missing.status,409);assert.equal((await missing.json()).code,'SETUP_REQUIRED');
  assert.equal((await send({password:'654321'},{setup:true,capability:'X'.repeat(43)})).status,403);
  const root=resolve('dist/pages'),errors=[];let loseFirstSetupResponse=true;
  async function newDevice(){
    const context=await browser.newContext({viewport:{width:390,height:950},serviceWorkers:'block'});
    await context.route(base+'**',async route=>{
      const file=resolve(root,new URL(route.request().url()).pathname.replace('/digitales-rezeptbuch/','')||'index.html');
      if(!file.startsWith(root+'\\'))return route.abort();
      const contentType={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[extname(file)]??'application/octet-stream';
      try{await route.fulfill({status:200,contentType,body:await readFile(file)});}catch{await route.fulfill({status:404,body:'not found'});}
    });
    await context.route(backend+'/**',async route=>{
      const req=route.request(),body=req.postData();
      const response=await api.fetch(new Request(req.url(),{method:req.method(),headers:req.headers(),...(body?{body}:{})}));
      const headers=Object.fromEntries(response.headers),bytes=Buffer.from(await response.arrayBuffer());
      if(loseFirstSetupResponse&&req.method()==='POST'&&req.url().endsWith('/api/session?setup=1')&&response.ok){loseFirstSetupResponse=false;return route.fulfill({status:503,headers,contentType:'application/json',body:JSON.stringify({error:'SYNTHETISCH: Antwort unterbrochen. Bitte erneut versuchen.'})});}
      await route.fulfill({status:response.status,headers,body:bytes});
    });
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));return{context,page};
  }
  const desktop=await newDevice();await desktop.page.goto(base);
  await desktop.page.getByRole('heading',{name:'Dein Rezeptbuch wartet auf die Einrichtung',exact:true}).waitFor();
  assert.equal(await desktop.page.getByLabel('Dein Code oder Passwort',{exact:true}).count(),0);
  await desktop.page.goto(base+'#setup='+config.setup);
  await desktop.page.getByRole('heading',{name:'Dein privates Rezeptbuch einrichten',exact:true}).waitFor();
  assert.equal(new URL(desktop.page.url()).hash,'');
  await desktop.page.reload();
  await desktop.page.getByRole('button',{name:'Festlegen und öffnen',exact:true}).waitFor();
  assert.equal(await desktop.page.getByLabel('Dein Code oder Passwort',{exact:true}).getAttribute('minlength'),null);
  await desktop.page.getByRole('button',{name:'Am iPhone / iPad einrichten',exact:true}).click();
  await desktop.page.getByRole('img',{name:'Privater Einrichtungslink für dein Rezeptbuch',exact:true}).waitFor();
  assert.equal(await desktop.page.getByRole('button',{name:'Einrichtungslink kopieren',exact:true}).count(),1);
  const phone=await newDevice();await phone.page.goto(base+'#setup='+config.setup);
  await phone.page.getByRole('button',{name:'Festlegen und öffnen',exact:true}).waitFor();
  await phone.page.getByLabel('Dein Code oder Passwort',{exact:true}).fill('654321');
  await phone.page.getByRole('button',{name:'Festlegen und öffnen',exact:true}).click();
  await phone.page.getByRole('alert').filter({hasText:/Antwort unterbrochen/}).waitFor();
  // Same submission recovers a lost success; does not replace the saved owner.
  await phone.page.getByRole('button',{name:'Festlegen und öffnen',exact:true}).click();
  await phone.page.getByText('Privates Rezeptbuch verbunden',{exact:true}).waitFor();
  assert.equal(await phone.page.evaluate(()=>sessionStorage.getItem('digitales-rezeptbuch-setup-v1')),null);
  await phone.page.reload();await phone.page.getByText('Privates Rezeptbuch verbunden',{exact:true}).waitFor();
  assert.equal((await send({password:'different'},{setup:true})).status,409);
  const wrong=await send({password:'wrong'});assert.equal(wrong.status,401);assert.match((await wrong.json()).error,/Code oder Passwort stimmen nicht/);
  await desktop.page.reload();await desktop.page.getByRole('button',{name:'Mit Code oder Passwort öffnen',exact:true}).waitFor();
  assert.equal(await desktop.page.evaluate(()=>sessionStorage.getItem('digitales-rezeptbuch-setup-v1')),null);
  await desktop.page.getByLabel('Dein Code oder Passwort',{exact:true}).fill('654321');await desktop.page.getByRole('button',{name:'Mit Code oder Passwort öffnen',exact:true}).click();
  await desktop.page.getByText('Privates Rezeptbuch verbunden',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);assert.equal(Number((await pool.query('SELECT COUNT(*) AS count FROM rb_jobs')).rows[0].count),jobsBefore);
  console.log(JSON.stringify({realHostedServer:Boolean(config.hostedApi),unconfiguredPublicPageExplained:true,noMisleadingLoginForm:true,privateSetupRequired:true,setupSurvivesReload:true,privateQrAvailable:true,secondDeviceSetup:true,sixDigitCode:true,lostResponseRecovered:true,existingOwnerCannotBeReset:true,setupPermissionCleared:true,browserErrors:0,recipesUnchanged:true,realProviderCalls:0}));
}finally{await browser.close();if(savedOwner)await pool.query('INSERT INTO rb_owner(id,salt,password_hash) VALUES(1,$1,$2) ON CONFLICT(id) DO UPDATE SET salt=EXCLUDED.salt,password_hash=EXCLUDED.password_hash',[savedOwner.salt,savedOwner.password_hash]);else await pool.query('DELETE FROM rb_owner WHERE id=1');await pool.query('DELETE FROM rb_auth_limits');await pool.end();}
