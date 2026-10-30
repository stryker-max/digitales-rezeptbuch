// Two invited synthetic accounts, real isolated PostgreSQL, developer Chrome contexts.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
let input='';for await(const chunk of process.stdin)input+=chunk;
const config=JSON.parse(input);input='';
const connection=new URL(config.environment.RECIPE_DATABASE_URL);
assert.match(connection.hostname,/^ep-shy-tooth-/);assert.match(connection.searchParams.get('options'),/search_path=recipe_preview_20261028$/);
Object.assign(process.env,config.environment);process.env.RECIPE_WRAPPED_RUNTIME='';
globalThis.recipeChatGPTRuntime={signInUrl:null,error:null,client:{getSession:async()=>({status:'disconnected',sharing:false}),listModels:async()=>[]}};
const {default:localApi}=await import('../../work/function-local/api/index.mjs');
if(config.hostedApi)assert.equal(config.hostedApi,'https://br-late-water-b9237cy9-recipeapi.compute.c-7.eu-central-1.aws.neon.tech');
const api=config.hostedApi?{fetch:async request=>{const url=new URL(request.url),headers=new Headers(request.headers);headers.delete('host');headers.delete('content-length');return fetch(config.hostedApi+url.pathname+url.search,{method:request.method,headers,...(request.body?{body:Buffer.from(await request.arrayBuffer())}:{}),redirect:'error'});}}:localApi;
const origin=config.environment.RECIPE_APP_ORIGIN,base=origin+'/digitales-rezeptbuch/',backend='https://br-synthetic-passkey.compute.test.neon.tech',root=resolve('dist/pages');
const staticFiles=new Map();
async function snapshot(directory){for(const item of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,item.name);if(item.isDirectory())await snapshot(path);else staticFiles.set(path,await readFile(path));}}
await snapshot(root);
const call=(path,body,token='')=>api.fetch(new Request(backend+path,{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',...(token?{'x-recipe-session':token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
await call('/api/session');const pool=config.hostedApi?await(await import('../../apps/web/src/lib/postgres-store.ts')).postgresPool():globalThis.recipePostgres.pool;
assert.equal(Number((await pool.query('SELECT COUNT(*) AS count FROM rb_accounts')).rows[0].count),0,'Only an unused synthetic account area is accepted.');
const savedOwner=(await pool.query('SELECT * FROM rb_owner WHERE id=1')).rows[0],oldKeys=(await pool.query('SELECT id,account_id FROM rb_passkeys')).rows;
const oldState=(await pool.query('SELECT * FROM rb_household')).rows,oldHistory=(await pool.query('SELECT * FROM rb_household_history')).rows;
assert.equal(oldKeys.length,0,'Use an empty synthetic passkey area.');
const originalJobs=Number((await pool.query('SELECT COUNT(*) AS count FROM rb_jobs')).rows[0].count);
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],suffix=randomUUID().slice(0,8),ownerEmail=`synthetic-owner-${suffix}@example.invalid`,partnerEmail=`synthetic-partner-${suffix}@example.invalid`;
let ownerToken='',partnerToken='';
async function device(width=390){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>route.abort());
 await context.route(base+'**',async route=>{const file=resolve(root,new URL(route.request().url()).pathname.replace('/digitales-rezeptbuch/','')||'index.html');if(!file.startsWith(root+'\\'))return route.abort();const contentType={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[extname(file)]??'application/octet-stream';const body=staticFiles.get(file);await route.fulfill(body?{status:200,contentType,body}:{status:404,body:'missing'});});
 await context.route(backend+'/**',async route=>{const req=route.request(),body=req.postData();const response=await api.fetch(new Request(req.url(),{method:req.method(),headers:req.headers(),...(body?{body}:{})}));await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));return{context,page};
}
async function fit(page){const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width,JSON.stringify(size));}
async function until(fn){for(let i=0;i<60;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,150));}throw Error('Synthetic shared state did not arrive.');}
const shared=async()=>{const response=await call('/api/household',undefined,ownerToken);assert.equal(response.status,200);return response.json();};
try{
 await pool.query('DELETE FROM rb_owner WHERE id=1');await pool.query('DELETE FROM rb_auth_limits');await pool.query('DELETE FROM rb_household');await pool.query('DELETE FROM rb_household_history');
 assert.equal((await call('/api/account',{action:'register-owner',email:ownerEmail,password:'654321',name:'Test-Inhaber'})).status,403);
 for(const width of [320,360,375,390,430,768]){const sample=await device(width);await sample.page.goto(base);await sample.page.getByLabel('E-Mail',{exact:true}).waitFor();await fit(sample.page);assert.ok(await sample.page.getByLabel('E-Mail',{exact:true}).evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));assert.equal(await sample.page.getByRole('button',{name:'Offline-Paket prüfen',exact:true}).count(),0);assert.equal(await sample.page.getByRole('button',{name:'Update laden',exact:true}).count(),0);if(width===390)await sample.page.screenshot({path:'work/household-login-390.png'});await sample.context.close();}
 const owner=await device();await owner.page.goto(base+'#setup='+config.setup);await owner.page.getByRole('button',{name:'Konto erstellen',exact:true}).waitFor();
 await owner.page.getByLabel('Dein Name',{exact:true}).fill('Test-Inhaber');await owner.page.getByLabel('E-Mail',{exact:true}).fill(ownerEmail);await owner.page.getByLabel('Passwort',{exact:true}).fill('654321');
 const created=owner.page.waitForResponse(response=>response.url()===backend+'/api/account'&&response.request().postDataJSON()?.action==='register-owner');await owner.page.getByRole('button',{name:'Konto erstellen',exact:true}).click();ownerToken=(await(await created).json()).session;
 await owner.page.getByTestId('account-ready').waitFor();await fit(owner.page);
 assert.equal((await call('/api/account',{action:'login',email:ownerEmail.toUpperCase(),password:'654321'})).status,200);assert.equal((await call('/api/account',{action:'login',email:ownerEmail,password:'wrong'})).status,401);
 assert.equal((await call('/api/account',{action:'register-owner',email:ownerEmail,password:'654321',name:'Do not replace'},ownerToken)).status,200);
 await owner.page.getByRole('button',{name:'Mein Konto',exact:true}).click();
 const invited=owner.page.waitForResponse(response=>response.url()===backend+'/api/account'&&response.request().postDataJSON()?.action==='invite');await owner.page.getByRole('button',{name:'Partner einladen',exact:true}).click();const invite=(await(await invited).json()).invite;
 const partner=await device();await partner.page.goto(base+'#invite='+invite);await partner.page.getByRole('button',{name:'Einladung annehmen',exact:true}).waitFor();await partner.page.reload();await partner.page.getByRole('button',{name:'Einladung annehmen',exact:true}).waitFor();
 await partner.page.getByLabel('Dein Name',{exact:true}).fill('Test-Partnerin');await partner.page.getByLabel('E-Mail',{exact:true}).fill(partnerEmail);await partner.page.getByLabel('Passwort',{exact:true}).fill('123456');
 const joined=partner.page.waitForResponse(response=>response.url()===backend+'/api/account'&&response.request().postDataJSON()?.action==='join');await partner.page.getByRole('button',{name:'Einladung annehmen',exact:true}).click();partnerToken=(await(await joined).json()).session;await partner.page.getByTestId('account-ready').waitFor();
 assert.equal((await call('/api/account',{action:'join',email:partnerEmail,name:'Do not replace',password:'123456',invite})).status,200);
 assert.equal((await call('/api/account',{action:'invite'},partnerToken)).status,403);assert.equal((await call('/api/chatgpt?action=disconnect',{},partnerToken)).status,403);
 assert.equal((await call('/api/account',{action:'join',email:`third-${suffix}@example.invalid`,name:'third',password:'1',invite})).status,403);
 assert.deepEqual((await(await call('/api/collection',undefined,partnerToken)).json()).recipes,(await(await call('/api/collection',undefined,ownerToken)).json()).recipes);
 await owner.page.getByRole('button',{name:'Kontoeinstellungen schließen',exact:true}).click();await owner.page.getByRole('button',{name:'Wochenplan',exact:true}).click();await owner.page.getByRole('button',{name:'Vorschlag füllen',exact:true}).click();await owner.page.getByRole('button',{name:'Plan übernehmen',exact:true}).click();
 await until(async()=>{const value=await shared();return value.state?.adopted&&value.state.plan.every(Boolean);});
 await partner.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await partner.page.getByRole('button',{name:'Wochenplan',exact:true}).click();await partner.page.getByLabel(/(?:Portionen|Rezeptmengen) am Montag/).waitFor();await partner.page.getByLabel(/(?:Portionen|Rezeptmengen) am Montag/).selectOption('6');
 await until(async()=>(await shared()).state.plan[0].servings===6);
 await owner.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await owner.page.getByRole('button',{name:'Wochenplan',exact:true}).click();await until(async()=>await owner.page.getByLabel(/(?:Portionen|Rezeptmengen) am Montag/).inputValue()==='6');
 await owner.page.getByRole('button',{name:'Einkauf',exact:true}).click();await owner.page.locator('.shop-row input[type=checkbox]:not(:disabled)').first().check();await owner.page.getByLabel('Eigene Einkaufsposition',{exact:true}).fill('SYNTHETISCH Brot');await owner.page.getByRole('button',{name:'Hinzufügen',exact:true}).click();
 await until(async()=>{const value=await shared();return Object.values(value.state.purchased).some(v=>v>0)&&value.state.manualItems.some(item=>item.text==='SYNTHETISCH Brot');});
 await partner.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await partner.page.getByRole('button',{name:'Einkauf',exact:true}).click();await partner.page.getByText('SYNTHETISCH Brot',{exact:true}).waitFor();await fit(partner.page);
 await partner.page.getByRole('button',{name:'Wochenplan',exact:true}).click();await partner.context.setOffline(true);await partner.page.getByLabel(/(?:Portionen|Rezeptmengen) am Montag/).selectOption('4');await until(async()=>await partner.page.evaluate(()=>JSON.parse(localStorage.getItem('digitales-rezeptbuch-shared-queue-v1')).target.plan[0].servings===4));
 await partner.page.reload();await partner.page.getByTestId('account-ready').waitFor();await partner.context.setOffline(false);await partner.page.evaluate(()=>window.dispatchEvent(new Event('online')));await until(async()=>(await shared()).state.plan[0].servings===4);
 // Different stale edits merge, identical entries conflict without altering the stored state.
 const before=await shared(),a=structuredClone(before.state),b=structuredClone(before.state);a.plan[0].servings=2;b.plan[1].servings=6;
 assert.equal((await call('/api/household',{version:before.version,state:a},ownerToken)).status,200);assert.equal((await call('/api/household',{version:before.version,state:b},partnerToken)).status,200);
 const after=await shared();assert.equal(after.state.plan[0].servings,2);assert.equal(after.state.plan[1].servings,6);assert.deepEqual(after.state.purchased,before.state.purchased);assert.deepEqual(after.state.manualItems,before.state.manualItems);
 const c=structuredClone(after.state),d=structuredClone(after.state);c.plan[0].servings=4;d.plan[0].servings=6;assert.equal((await call('/api/household',{version:after.version,state:c},ownerToken)).status,200);assert.equal((await call('/api/household',{version:after.version,state:d},partnerToken)).status,409);assert.equal((await shared()).state.plan[0].servings,4);
 await partner.page.getByRole('button',{name:'Mein Konto',exact:true}).click();
 const cdp=await partner.context.newCDPSession(partner.page);await cdp.send('WebAuthn.enable');await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 await partner.page.getByRole('button',{name:'Face ID aktivieren',exact:true}).click();await partner.page.getByText('Face ID ist eingerichtet.',{exact:true}).waitFor();await partner.page.getByRole('button',{name:'Abmelden',exact:true}).click();await partner.page.getByRole('button',{name:'Anmelden',exact:true}).waitFor();assert.equal((await call('/api/collection',undefined,partnerToken)).status,401);
 const face=partner.page.waitForResponse(response=>response.url()===backend+'/api/passkey'&&response.request().postDataJSON()?.action==='login-verify');await partner.page.getByRole('button',{name:'Mit Face ID anmelden',exact:true}).click();partnerToken=(await(await face).json()).session;await partner.page.getByTestId('account-ready').waitFor();const me=(await(await call('/api/account',undefined,partnerToken)).json()).user;assert.equal(me.email,partnerEmail);assert.equal(me.role,'member');
 for(const width of [320,360,375,390,430,768]){await owner.page.setViewportSize({width,height:900});for(const nav of ['Rezepte','Wochenplan','Einkauf']){await owner.page.getByRole('button',{name:nav,exact:true}).click();await fit(owner.page);}}await owner.page.setViewportSize({width:390,height:900});
 await owner.page.getByRole('button',{name:'Rezepte',exact:true}).click();await owner.page.screenshot({path:'work/household-library-390.png'});
 await owner.page.getByRole('button',{name:'Mein Konto',exact:true}).click();await fit(owner.page);await owner.page.screenshot({path:'work/household-settings-390.png'});
 assert.equal((await call('/api/account',{action:'remove-member',id:me.id},ownerToken)).status,200);assert.equal((await call('/api/collection',undefined,partnerToken)).status,401);
 assert.equal(Number((await pool.query('SELECT COUNT(*) AS count FROM rb_jobs')).rows[0].count),originalJobs);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({realHostedServer:Boolean(config.hostedApi),emailPasswordLogin:true,sixDigitPasswords:true,privateInvitation:true,ownPartnerAccount:true,sharedRecipes:true,sharedPlanAndShopping:true,purchasesAndManualItemsPreserved:true,offlineEditSurvivesReload:true,concurrentMerge:true,conflictsRejected:true,partnerPasskey:true,partnerCannotManageAbo:true,logoutRevoked:true,memberRemovalRevoked:true,widths:[320,360,375,390,430,768],technicalButtonsRemoved:true,browserErrors:0,realIphone:false,providerCalls:0}));
}finally{
 await browser.close();await pool.query('DELETE FROM rb_sessions');await pool.query('DELETE FROM rb_passkeys WHERE account_id IS NOT NULL');for(const key of oldKeys)await pool.query('UPDATE rb_passkeys SET account_id=$1 WHERE id=$2',[key.account_id,key.id]);await pool.query('DELETE FROM rb_accounts');await pool.query('DELETE FROM rb_invites');await pool.query('DELETE FROM rb_household');await pool.query('DELETE FROM rb_household_history');for(const row of oldState)await pool.query('INSERT INTO rb_household(id,version,state) VALUES($1,$2,$3)',[row.id,row.version,JSON.stringify(row.state)]);for(const row of oldHistory)await pool.query('INSERT INTO rb_household_history(version,state) VALUES($1,$2)',[row.version,JSON.stringify(row.state)]);if(savedOwner)await pool.query('INSERT INTO rb_owner(id,salt,password_hash) VALUES(1,$1,$2) ON CONFLICT(id) DO UPDATE SET salt=EXCLUDED.salt,password_hash=EXCLUDED.password_hash',[savedOwner.salt,savedOwner.password_hash]);else await pool.query('DELETE FROM rb_owner');await pool.query('DELETE FROM rb_auth_limits');await pool.end();
}
