import { tmpdir } from "node:os";
import { createHash, timingSafeEqual } from "node:crypto";
import { mkdtemp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { x } from "tar";
import type sharpType from "sharp";
import packages from "./native-packages.json";

// Keep the control-plane upload small. Fetch only public, integrity-pinned npm
// artifacts on first image use. WASM works without executable filesystem mappings.
// No npm process or installation scripts execute.
let ready: Promise<typeof sharpType> | undefined;
async function nativeSharp(): Promise<typeof sharpType> {
  ready ??= (async () => {
    if (typeof SharedArrayBuffer === "undefined") throw new Error("Bildmodul benötigt mehrsträngiges WebAssembly.");
    const directory = await mkdtemp(join(tmpdir(), "recipe-image-"));
    for (const pkg of packages) {
      if (!/^(@[a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)$/.test(pkg.name) || !pkg.url.startsWith("https://registry.npmjs.org/") || !/^sha512-/.test(pkg.integrity)) throw new Error("Ungültiges Bildmodul-Manifest.");
      const response = await fetch(pkg.url, { redirect: "error", signal: AbortSignal.timeout(60000) });
      if (!response.ok || Number(response.headers.get("content-length")) > 12000000) throw new Error("Bildmodul nicht verfügbar.");
      const reader = response.body!.getReader(), chunks: Uint8Array[] = []; let size = 0;
      for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 12000000) { await reader.cancel(); throw new Error("Bildmodul zu groß."); } chunks.push(part.value); }
      const bytes = Buffer.concat(chunks), actual = createHash("sha512").update(bytes).digest(), expected = Buffer.from(pkg.integrity.slice(7), "base64");
      if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) throw new Error("Bildmodul-Prüfsumme stimmt nicht überein.");
      const target = join(directory, "node_modules", pkg.name); await mkdir(target, { recursive: true }); let unpacked = 0;
      const unpack = x({ cwd: target, strip: 1, strict: true, preservePaths: false, filter(path, entry) {
        unpacked += entry.size;
        if (path.startsWith("/") || path.split(/[\\/]/).includes("..") || !("type" in entry) || !["File", "Directory"].includes(entry.type) || unpacked > 64000000) throw new Error("Unsicheres Bildmodul-Archiv.");
        return true;
      } });
      await new Promise<void>((done, fail) => { unpack.on("error", fail); unpack.on("close", done); Readable.from(bytes).on("error", fail).pipe(unpack); });
    }
    const require = createRequire(join(directory, "package.json"));
    return require(resolve(directory, "node_modules/sharp")) as typeof sharpType;
  })();
  try { return await ready; } catch (error) { ready = undefined; throw error; }
}

// The source validator uses these chain methods; defer loading until metadata or
// a work-copy buffer is actually requested. Health/login do not download images.
export default ((...input: Parameters<typeof sharpType>) => {
  const operations: { name: string; args: unknown[] }[] = [];
  const proxy = new Proxy({}, { get(_target, name: string) {
    if (["metadata", "toBuffer"].includes(name)) return async (...args: unknown[]) => {
      const factory = await nativeSharp(); let pipeline = factory(...input);
      for (const operation of operations) pipeline = (pipeline as unknown as Record<string, (...args: unknown[]) => typeof pipeline>)[operation.name](...operation.args);
      return (pipeline as unknown as Record<string, (...args: unknown[]) => unknown>)[name](...args);
    };
    if (!["rotate", "resize", "png"].includes(name)) throw new Error("Nicht unterstützte Bildoperation.");
    return (...args: unknown[]) => { operations.push({ name, args }); return proxy; };
  } });
  return proxy;
}) as typeof sharpType;
