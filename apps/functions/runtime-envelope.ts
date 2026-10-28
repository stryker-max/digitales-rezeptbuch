import { hkdfSync, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const aad = Buffer.from("recipe-runtime-envelope-v1");
const allowed = ["RECIPE_APP_ORIGIN", "RECIPE_SESSION_KEY", "RECIPE_CREDENTIAL_KEY", "RECIPE_WORKER_SECRET", "RECIPE_SETUP_HASH", "ANALYSIS_DAILY_CALL_LIMIT", "RECIPE_DATABASE_SCHEMA"];
function key(connectionString: string) {
  const password = decodeURIComponent(new URL(connectionString).password);
  if (!password) throw new Error("Geschützte Runtime benötigt die eigene Datenbankverbindung.");
  return Buffer.from(hkdfSync("sha256", Buffer.from(password), aad, Buffer.from("runtime"), 32));
}
function validate(config: Record<string, string>) {
  if (!config || Object.keys(config).some(name => !allowed.includes(name) || typeof config[name] !== "string")) throw new Error("Ungültige Konfigurationsfelder.");
  return config;
}
export function wrapRuntime(config: Record<string, string>, connectionString: string): string {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(connectionString), nonce);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(validate(config)), "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function unwrapRuntime(value: string, connectionString: string): Record<string, string> {
  const bytes = Buffer.from(value, "base64url");
  if (!/^[A-Za-z0-9_-]+$/.test(value) || bytes.length < 28 || bytes.length > 16000) throw new Error("Ungültige geschützte Konfiguration.");
  const cipher = createDecipheriv("aes-256-gcm", key(connectionString), bytes.subarray(0, 12));
  cipher.setAAD(aad); cipher.setAuthTag(bytes.subarray(12, 28));
  return validate(JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8")));
}
