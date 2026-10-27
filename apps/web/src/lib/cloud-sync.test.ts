import test from "node:test";
import assert from "node:assert/strict";
import { createArchive, sameRecipeContent } from "./local-archive.ts";
import { sha256, type LocalRecipe } from "./local-store.ts";
import { loadConfirmedCloudRecipes } from "./cloud-sync.ts";

async function example(): Promise<LocalRecipe> {
  const sourceBlob=new Blob(["Synthetic original only"],{type:"image/png"});
  return { id:"0d18f342-e1f8-4e67-900f-4e7ebcb61590",title:"Synthetic recipe",description:"Synthetic fixture",demo:false,tags:[],servings:null,estimatedMinutes:null,ingredients:[{id:"i1",name:"Apfel",amountText:"1 Stück",quantity:1,unit:"Stück",group:"Obst"}],equipment:[],steps:[{title:"Schritt 1",instruction:"Apfel schneiden.",relatedIngredients:[]}],sourceText:"1 Stück Apfel. Apfel schneiden.",sourceName:"synthetic.png",sourceType:"image/png",sourceHash:await sha256(sourceBlob),sourceBlob,createdAt:"2026-10-27T12:00:00Z",analysis:{model:"synthetic",promptVersion:"synthetic",blocks:[{id:"b1",page:1,text:"1 Stück Apfel. Apfel schneiden."}],issues:[],resolutions:{},originalTranscription:"1 Stück Apfel. Apfel schneiden."} };
}
test("private device sync verifies original bytes, preserves provenance and deduplicates immutable recipes", async () => {
  const recipe=await example(), archive=await createArchive([recipe]); let requests=0;
  const metadata={...recipe,sourceBlob:undefined};
  const fetcher=(async (input: RequestInfo|URL) => { requests++;return String(input)==="/api/collection"?Response.json({recipes:[metadata]}):new Response(archive); }) as typeof fetch;
  const fresh=await loadConfirmedCloudRecipes([],fetcher); assert.equal(fresh.length,1); assert.equal(fresh[0].sourceHash,recipe.sourceHash); assert.equal(sameRecipeContent(fresh[0],recipe),true);
  assert.deepEqual(Buffer.from(await fresh[0].sourceBlob.arrayBuffer()),Buffer.from(await recipe.sourceBlob.arrayBuffer()));
  requests=0; assert.deepEqual(await loadConfirmedCloudRecipes(fresh,fetcher),[]); assert.equal(requests,1);
});
test("private sync rejects conflicting IDs and source manipulation without changing local data", async () => {
  const recipe=await example(); const before=JSON.stringify(recipe);
  const conflict=(async()=>Response.json({recipes:[{...recipe,title:"Conflicting content"}]})) as typeof fetch;
  await assert.rejects(loadConfirmedCloudRecipes([recipe],conflict),/widerspricht/); assert.equal(JSON.stringify(recipe),before);
  const invalid=(async()=>Response.json({recipes:[{id:"../outside"}]})) as typeof fetch;
  await assert.rejects(loadConfirmedCloudRecipes([],invalid),/Rezeptkennung/);
  const archive=JSON.parse(await (await createArchive([recipe])).text());archive.recipes[0].sourceBase64=btoa("tampered");
  const forged=(async(input:RequestInfo|URL)=>String(input)==="/api/collection"?Response.json({recipes:[recipe]}):Response.json(archive)) as typeof fetch;
  await assert.rejects(loadConfirmedCloudRecipes([],forged),/Prüfsumme/);
});
