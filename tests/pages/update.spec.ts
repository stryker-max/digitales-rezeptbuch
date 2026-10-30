import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

test("background updates preserve cooking and are adopted on the next safe return", async ({ page }) => {
  const workerFile = resolve("dist/pages/sw.js"), original = await readFile(workerFile, "utf8");
  let navigations = 0;
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
  try {
    await page.goto("./"); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.getByRole("button", { name: "Rezept ansehen", exact: true }).click();
    await page.getByRole("button", { name: "Rezept kochen", exact: true }).click();
    const before = await page.getByRole("button", { name: "Weiter", exact: true }).boundingBox();
    const entered = navigations;
    await page.evaluate(() => navigator.serviceWorker.addEventListener("controllerchange", () => { document.documentElement.dataset.workerChanged = "yes"; }, { once: true }));
    const changed = original.replace(/const CACHE=("[^"]+")/, (_, encoded) => `const CACHE=${JSON.stringify(JSON.parse(encoded) + "-synthetic-update")}`);
    expect(changed).not.toBe(original); await writeFile(workerFile, changed);
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
    await page.waitForFunction(() => document.documentElement.dataset.workerChanged === "yes");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    expect(navigations).toBe(entered);
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
    expect(await page.getByRole("button", { name: "Weiter", exact: true }).boundingBox()).toEqual(before);
    await page.getByRole("button", { name: "Rezepte", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Was kochen wir heute?", exact: true })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => navigations).toBeGreaterThan(entered);
    await expect(page.getByRole("heading", { name: "Was kochen wir heute?", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Update laden", exact: true })).toHaveCount(0);
  } finally { await writeFile(workerFile, original); }
});
