// Run only after the owner authorizes Neon as the Abo runtime. No credentials
// leave stdout, command-line arguments, source control or plaintext temp files.
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {ConnectionStore} from "../packages/chatgpt-local/dist/storage.js";
import {windowsEncryption} from "../apps/web/src/lib/windows-encryption.ts";
import {serverEncryption} from "../apps/web/src/lib/server-encryption.ts";
import {importPostgresBootstrap,PostgresProfiles} from "../apps/web/src/lib/postgres-profiles.ts";
import {postgresPool} from "../apps/web/src/lib/postgres-store.ts";
import {resolve} from "node:path";
const config=JSON.parse(await windowsEncryption.decrypt(await readFile(new URL("../private/neon-server-config.dpapi",import.meta.url))));
Object.assign(process.env,config.environment,{RECIPE_DATABASE_URL:config.databaseUrl,RECIPE_PRIVATE_SERVER:"true"});
const directory=resolve(import.meta.dirname,"../private/chatgpt-abo"),sourceFile=resolve(directory,"chatgpt-auth.json");
const hash=async()=>createHash("sha256").update(await readFile(sourceFile)).digest("hex");
const before=await hash(),source=new ConnectionStore(directory,windowsEncryption);
try{
 const state=await source.withLock(async()=>{
  const value=await source.read(),profile=value?.profiles.find(p=>p.id===value.activeProfileId);
  if(!profile?.credentials?.refreshToken||profile.status!=="connected"||!profile.scopes.includes("chatgpt.tokens.use.direct"))throw new Error("Freigegebene Rezeptbuch-Verbindung fehlt.");
  return{version:2,activeProfileId:profile.id,profiles:[profile],pendingRegistrations:[]};
 });
 const encryption=serverEncryption(config.environment.RECIPE_CREDENTIAL_KEY);
 const encrypted=Buffer.from(await encryption.encrypt(JSON.stringify({kind:"recipe-server-bootstrap-v1",state}))).toString("base64url");
 await importPostgresBootstrap(config.environment.RECIPE_CREDENTIAL_KEY,encrypted);
 const target=new PostgresProfiles(config.environment.RECIPE_CREDENTIAL_KEY);
 await target.withLock(async()=>{
  const saved=await target.read();
  if(saved?.activeProfileId!==state.activeProfileId||saved.profiles[0]?.clientId!==state.profiles[0].clientId)throw new Error("Vorhandener Serverzugang gehört zu einer anderen App-Verbindung; nichts überschrieben.");
 });
 if(before!==await hash())throw new Error("Originalprofil wurde während der Übergabe verändert.");
 console.log(JSON.stringify({encryptedAboImport:true,originalProfileUnchanged:true,providerCalls:0}));
}finally{await(await postgresPool()).end();}
