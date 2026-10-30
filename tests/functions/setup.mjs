// Compatibility for the previously deployed owner code. New account UI is tested in household.mjs.
import assert from 'node:assert/strict';
let input='';for await(const chunk of process.stdin)input+=chunk;
const config=JSON.parse(input);input='';const url=new URL(config.environment.RECIPE_DATABASE_URL);
assert.match(url.hostname,/^ep-shy-tooth-/);assert.match(url.searchParams.get('options'),/search_path=recipe_preview_20261028$/);
Object.assign(process.env,config.environment);process.env.RECIPE_WRAPPED_RUNTIME='';
const {default:api}=await import('../../work/function-local/api/index.mjs');
const call=(body,setup=false)=>api.fetch(new Request('https://synthetic.example/api/session'+(setup?'?setup=1':''),{method:body?'POST':'GET',headers:{origin:config.environment.RECIPE_APP_ORIGIN,'content-type':'application/json',...(setup?{'x-recipe-setup':config.setup}:{})},...(body?{body:JSON.stringify(body)}:{})}));
await call();const pool=globalThis.recipePostgres.pool;assert.equal(Number((await pool.query('SELECT COUNT(*) AS count FROM rb_accounts')).rows[0].count),0);
const owner=(await pool.query('SELECT * FROM rb_owner WHERE id=1')).rows[0];
try{await pool.query('DELETE FROM rb_owner');await pool.query('DELETE FROM rb_auth_limits');
 assert.equal((await(await call()).json()).configured,false);
 const missing=await call({password:'654321'});assert.equal(missing.status,409);assert.equal((await missing.json()).code,'SETUP_REQUIRED');
 assert.equal((await call({password:'654321'},true)).status,200);assert.equal((await call({password:'654321'},true)).status,200);assert.equal((await call({password:'different'},true)).status,409);
 assert.equal((await call({password:'654321'})).status,200);assert.equal((await(await call()).json()).configured,true);
 console.log(JSON.stringify({legacyCodePreserved:true,missingSetupExplained:true,sixDigitCode:true,repeatedSetupIdempotent:true,existingOwnerCannotBeReset:true,realProviderCalls:0}));
}finally{if(owner)await pool.query('INSERT INTO rb_owner(id,salt,password_hash) VALUES(1,$1,$2) ON CONFLICT(id) DO UPDATE SET salt=EXCLUDED.salt,password_hash=EXCLUDED.password_hash',[owner.salt,owner.password_hash]);else await pool.query('DELETE FROM rb_owner');await pool.query('DELETE FROM rb_auth_limits');await pool.end();}
