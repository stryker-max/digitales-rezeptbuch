import { randomBytes } from "node:crypto";
import { unwrapRuntime } from "./runtime-envelope.ts";
let initialized = false;
export function initializeRuntime() {
  if (initialized) return;
  if (process.env.RECIPE_WRAPPED_RUNTIME) {
    const connection = new URL(process.env.DATABASE_URL_UNPOOLED ?? "");
    const config = unwrapRuntime(process.env.RECIPE_WRAPPED_RUNTIME, connection.toString());
    Object.assign(process.env, config);
    if (config.RECIPE_DATABASE_SCHEMA) {
      if (!/^[a-z0-9_]{1,63}$/.test(config.RECIPE_DATABASE_SCHEMA)) throw new Error("Ungültiger Datenbereich.");
      connection.searchParams.set("options", `-c search_path=${config.RECIPE_DATABASE_SCHEMA}`);
    }
    process.env.RECIPE_DATABASE_URL = connection.toString();
  }
  const database = process.env.RECIPE_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!database) throw new Error("Private Datenbank fehlt.");
  process.env.RECIPE_DATABASE_URL = database;
  process.env.RECIPE_PRIVATE_SERVER = "true";
  process.env.ANALYSIS_AUTH_MODE = "chatgpt";
  process.env.LOCAL_ANALYSIS_ENABLED = "true";
  process.env.RECIPE_INTERNAL_TOKEN = randomBytes(32).toString("base64url");
  process.env.OPENAI_API_KEY = ""; process.env.OPENAI_MODEL = "";
  initialized = true;
}
