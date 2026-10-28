// The authorized Windows administrator keeps a DPAPI-protected recovery copy.
// stdout contains ONLY the authenticated-encrypted deployment envelope.
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { windowsEncryption } from "../apps/web/src/lib/windows-encryption.ts";
import { wrapRuntime } from "../apps/functions/runtime-envelope.ts";
const file=new URL("../private/neon-server-config.dpapi",import.meta.url);
let config;
try{config=JSON.parse(await windowsEncryption.decrypt(await readFile(file)));}
catch(error){
  if(error.code!=="ENOENT")throw new Error("Vorhandene geschützte Servereinrichtung konnte nicht gelesen werden; sie bleibt erhalten.");
  const databaseUrl=await windowsEncryption.decrypt(await readFile(new URL("../private/neon-render.dpapi",import.meta.url)));
  const url=new URL(databaseUrl);
  if(url.hostname!=="ep-blue-lake-b9lcnxhh.c-7.eu-central-1.aws.neon.tech"||url.pathname!=="/rezeptbuch")throw new Error("Unerwartete freigegebene Rezeptdatenbank.");
  const setup=randomBytes(32).toString("base64url");
  config={version:1,databaseUrl,setup,environment:{RECIPE_APP_ORIGIN:"https://stryker-max.github.io",RECIPE_SESSION_KEY:randomBytes(32).toString("base64url"),RECIPE_CREDENTIAL_KEY:randomBytes(32).toString("base64url"),RECIPE_WORKER_SECRET:randomBytes(32).toString("base64url"),RECIPE_SETUP_HASH:createHash("sha256").update(setup).digest("hex"),ANALYSIS_DAILY_CALL_LIMIT:"20"}};
  await writeFile(file,await windowsEncryption.encrypt(JSON.stringify(config)));
}
process.stdout.write(wrapRuntime(config.environment,config.databaseUrl));
