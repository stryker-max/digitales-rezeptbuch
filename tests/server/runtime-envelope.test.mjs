import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {wrapRuntime,unwrapRuntime} from '../../apps/functions/runtime-envelope.ts';
test('runtime envelope authenticates its configuration and never contains plaintext secrets',()=>{
 const secret=randomBytes(32).toString('base64url'),url='postgresql://synthetic:only-test-password@example.invalid/rezeptbuch';
 const config={RECIPE_SESSION_KEY:secret};const encrypted=wrapRuntime(config,url);
 assert.equal(encrypted.includes(secret),false);assert.deepEqual(unwrapRuntime(encrypted,url),config);
 assert.throws(()=>unwrapRuntime(encrypted,url.replace('only-test-password','wrong-password')));
 const bytes=Buffer.from(encrypted,'base64url');bytes[15]^=1;assert.throws(()=>unwrapRuntime(bytes.toString('base64url'),url));
 assert.throws(()=>wrapRuntime({OPENAI_API_KEY:'forbidden'},url));
});
