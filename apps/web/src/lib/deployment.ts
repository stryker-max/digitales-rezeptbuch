export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const staticHosting = process.env.NEXT_PUBLIC_STATIC_HOSTING === "true";

export const remoteApiBase = process.env.NEXT_PUBLIC_RECIPE_API_BASE ?? "";
export const analysisAvailable = !staticHosting || Boolean(remoteApiBase);
