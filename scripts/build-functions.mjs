import { build } from "esbuild";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
const root=resolve(import.meta.dirname,"..");
const external=process.argv.includes("--deploy");
for(const name of ["api","worker"]){
  const directory=resolve(root,external?`dist/functions/${name}`:`work/function-local/${name}`);
  await mkdir(directory,{recursive:true});
  await build({entryPoints:[resolve(root,`apps/functions/${name}.ts`)],outfile:resolve(directory,"index.mjs"),bundle:true,platform:"node",target:"node24",format:"esm",alias:{"@":resolve(root,"apps/web/src"),...(external?{sharp:resolve(root,"apps/functions/native-sharp.ts")}: {})},external:external?[]:["sharp"],banner:{js:"import{createRequire as ___cr}from'node:module';import{fileURLToPath as ___f}from'node:url';import{dirname as ___d}from'node:path';const require=___cr(import.meta.url);const __filename=___f(import.meta.url);const __dirname=___d(__filename);"}});
}
console.log("Private API und Worker gebaut; keine Geheimnisse im Paket.");
