import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const privateCookieName = "__Host-rezeptbuch";
const equal = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
export function privateOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Eine feste private HTTPS-Adresse ohne Pfad ist erforderlich.");
  return url.origin;
}
export function privateHost(secret: string, origin: string) {
  if (!/^[A-Za-z0-9_+/=-]{43,100}$/.test(secret)) throw new Error("Ein zufälliger privater Serverschlüssel ist erforderlich.");
  const audience = privateOrigin(origin);
  const sign = (body: string) => createHmac("sha256", secret).update(`recipe-owner-v1:${audience}:${body}`).digest("base64url");
  return {
    issue(now = Date.now()) {
      const body = `${now + 30 * 86400000}.${randomBytes(24).toString("base64url")}`;
      return `${body}.${sign(body)}`;
    },
    verify(value: string, now = Date.now()) {
      if (value.length > 200 || !/^\d{13}\.[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(value)) return false;
      const [expiry, nonce, signature] = value.split(".");
      const until = Number(expiry);
      return until > now && until <= now + 31 * 86400000 && equal(signature, sign(`${expiry}.${nonce}`));
    },
    passwordMatches(candidate: string, password: string) { return password.length >= 20 && password.length <= 200 && equal(candidate, password); },
  };
}

// Set exclusively by the authenticated gateway, stripped from external requests.
export function privateServerRequest(request: Request): boolean {
  const secret = process.env.RECIPE_INTERNAL_TOKEN;
  return process.env.RECIPE_PRIVATE_SERVER === "true" && Boolean(secret && secret.length >= 40 && equal(request.headers.get("x-recipe-owner") ?? "", secret));
}
