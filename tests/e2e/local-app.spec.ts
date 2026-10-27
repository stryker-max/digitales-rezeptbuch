import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { openJobs, claimJob, publishResult } from "../../apps/web/src/lib/analysis-server.ts";

test("automatically recognized recipe, plan, purchases and metadata survive offline reload and complete restore", async ({ page, context, browser }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const original = await sharp({ create: { width: 300, height: 300, channels: 3, background: "white" } }).png().toBuffer();
  const base = "http://127.0.0.1:3119";
  await page.goto(base);
  await page.getByRole("button", { name: "Offline-Paket prüfen", exact: true }).waitFor();
  await page.getByRole("button", { name: "Rezept hinzufügen", exact: true }).click();
  const automatic = page.getByRole("checkbox", { name: /^Automatisch erkennen:/ });
  await expect(automatic).not.toBeChecked();
  let uploads = 0;
  page.on("request", (request) => { if (request.method() === "POST" && request.url() === `${base}/api/analysis`) uploads++; });
  await page.locator('input[type=file][accept="image/*,application/pdf"]').setInputFiles({ name: "synthetische-testvorlage.png", mimeType: "image/png", buffer: original });
  await expect(page.getByRole("button", { name: "Foto automatisch erkennen", exact: true })).toBeDisabled();
  expect(uploads).toBe(0);
  await expect(page.getByRole("button", { name: "Selbst übertragen" })).toHaveCount(0);
  const uploaded = page.waitForResponse((response) => response.request().method() === "POST" && response.url() === `${base}/api/analysis`);
  // This deliberate opt-in grants future selected-file transmission. No Abo grant
  // or selecting a file alone sends anything. No provider worker runs in this test.
  await automatic.check(); expect((await uploaded).status()).toBe(202);
  const db = openJobs(resolve(process.env.RECIPE_E2E_DIR!, "analysis.sqlite"));
  try {
    const job = claimJob(db, 100)!;
    publishResult(db, job, {
      status: "recipe", issues: [], blocks: [{ id: "b1", page: 1, text: "Synthetische Karottensuppe. 500 g Karotte. In der Pfanne garen, falls nötig. Künstliche Testnotiz." }],
      recipe: { title: "Synthetische Karottensuppe", titleBlockIds: ["b1"], servings: null, servingsRaw: null, servingsBlockIds: [], ingredients: [{ amount: "500", unit: "g", name: "Karotte", blockIds: ["b1"] }], equipment: [], steps: [{ text: "In der Pfanne garen, falls nötig.", blockIds: ["b1"] }], notes: [{ text: "Künstliche Testnotiz.", blockIds: ["b1"] }], excludedBlocks: [] },
    });
  } finally { db.close(); }
  await expect(page.getByRole("heading", { name: "Dein Rezept ist bereit.", exact: true })).toBeVisible();
  await expect(page.getByText("500 g", { exact: true })).toBeVisible();
  await expect(page.locator(".manual-fields h2")).toHaveText("Synthetische Karottensuppe");
  await page.getByRole("button", { name: "Geprüft speichern", exact: true }).click();
  expect(uploads).toBe(1);
  await expect(page.getByRole("heading", { name: "Synthetische Karottensuppe", exact: true })).toBeVisible();
  await page.getByLabel("Tags bearbeiten").fill("Gemüse, Eigener Test");
  await page.getByRole("heading", { name: "Tags", exact: true }).click();
  await page.getByRole("button", { name: "Einplanen", exact: true }).click();
  await expect(page.getByLabel("Rezeptmengen am Donnerstag")).toHaveValue("1");
  await page.getByRole("button", { name: "Plan übernehmen", exact: true }).click();
  await page.getByRole("checkbox", { name: "Karotte Donnerstag", exact: true }).check();
  await page.getByLabel("Eigene Einkaufsposition", { exact: true }).fill("Synthetische Zusatzposition");
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await page.getByRole("button", { name: "Menü bearbeiten" }).click();
  await page.getByLabel("Rezeptmengen am Donnerstag").selectOption("2");
  await page.getByRole("button", { name: "Zum Einkauf", exact: true }).click();
  const carrot = page.locator("label.shop-row").filter({ has: page.getByRole("checkbox", { name: "Karotte Donnerstag", exact: true }) });
  await expect(carrot).toContainText("500 g gekauft");
  await expect(carrot.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByText("Synthetische Zusatzposition", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Rezepte", exact: true }).click();
  await page.getByRole("button", { name: "Offline-Paket prüfen", exact: true }).click();
  await expect(page.getByText(/Offline geprüft: App und 1 eigene Rezepte/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sammlung sichern", exact: true }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  // Inspect actual downloaded Blob bytes. Windows test environment denies copying
  // Chrome's temporary download file; the OS copy is not claimed as validated.
  const archiveText = await page.evaluate((url) => fetch(url).then((response) => response.text()), download.url());
  const archiveBuffer = Buffer.from(archiveText); const archive = JSON.parse(archiveText);
  expect(archive.version).toBe(2);
  expect(archive.recipes[0].sourceNotes).toEqual(["Künstliche Testnotiz."]);
  expect(archive.recipes[0].analysis.structured.ingredients[0].amount).toBe("500");
  expect(archive.recipes[0].sourceHash).toBe(createHash("sha256").update(original).digest("hex"));
  expect(archive.preferences.purchased["karotte|g"]).toBe(500);
  expect(archive.preferences.metadata[archive.recipes[0].id].tags).toContain("Eigener Test");
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole("heading", { name: "Synthetische Karottensuppe", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ansehen", exact: true }).first().click();
  await page.getByRole("button", { name: "Rezept kochen", exact: true }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Weiterkochen", exact: true }).click();
  await expect(page.locator(".cook-counter")).toContainText("2 / 3");
  expect(errors).toEqual([]);
  const restoredContext = await browser.newContext();
  const restored = await restoredContext.newPage(); await restored.goto("http://127.0.0.1:3118/");
  await restored.getByRole("button", { name: "Rezept hinzufügen", exact: true }).click();
  await restored.locator('input[type=file][accept="application/json,.json"]').setInputFiles({ name: "synthetische-sicherung.json", mimeType: "application/json", buffer: archiveBuffer });
  await restored.getByRole("button", { name: "Gesicherte Einstellungen übernehmen", exact: true }).click();
  await restored.getByRole("button", { name: "Einkauf", exact: false }).first().click();
  await expect(restored.getByText("Synthetische Zusatzposition", { exact: true })).toBeVisible();
  await expect(restored.getByText(/500 g gekauft/)).toBeVisible();
  await restoredContext.close();
});

for (const width of [320, 390, 768, 1024]) test(`cooking arrows keep their position and size at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 }); await page.goto("/");
  await page.getByRole("button", { name: "Rezept ansehen", exact: true }).click();
  await page.getByRole("button", { name: "Rezept kochen", exact: true }).click();
  const back = page.getByRole("button", { name: "Zurück", exact: true });
  const next = page.getByRole("button", { name: "Weiter", exact: true });
  const initial = [await back.boundingBox(), await next.boundingBox()];
  for (let i = 0; i < 7; i++) { await next.click(); expect([await back.boundingBox(), await next.boundingBox()]).toEqual(initial); }
  await expect(page.getByRole("heading", { name: "Fertig gekocht.", exact: true })).toBeVisible();
  await expect(next).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (width === 390) await page.screenshot({ path: testInfo.outputPath("synthetic-cooking-finish-390.png") });
});

test("unconfigured analysis never produces a demo result and foreign-origin writes fail", async ({ request }) => {
  const config = await request.get("/api/analysis"); expect(await config.json()).toEqual({ enabled: false });
  const response = await request.post("/api/analysis", { headers: { Origin: "https://foreign.example" } });
  expect(response.status()).toBe(403);
});

test("synthetic persistent analysis job requires user resolution and server confirmation", async ({ page, request }) => {
  // Only an injected synthetic extraction. No worker/provider is started in this test.
  const base = "http://127.0.0.1:3119";
  const id = randomUUID(), token = randomUUID();
  const png = await sharp({ create: { width: 200, height: 200, channels: 3, background: "white" } }).png().toBuffer();
  const upload = await request.post(`${base}/api/analysis`, { headers: { Origin: base }, multipart: { id, token, consent: "true", oneRecipe: "true", file: { name: "synthetische-ki-testquelle.png", mimeType: "image/png", buffer: png } } });
  expect(upload.status()).toBe(202);
  const hidden = await request.get(`${base}/api/analysis/${id}`, { headers: { Authorization: `Bearer ${randomUUID()}` } });
  expect(hidden.status()).toBe(404);
  const db = openJobs(resolve(process.env.RECIPE_E2E_DIR!, "analysis.sqlite"));
  try {
    const job = claimJob(db, 100)!;
    expect(job.id).toBe(id);
    publishResult(db, job, { status: "recipe", blocks: [{ id: "b1", page: 1, text: "Synthetische KI-Prüfung. 1 oder 7 Apfel. In die Pfanne geben, falls nötig." }], issues: [{ id: "i1", message: "1 oder 7 Äpfel?", blockIds: ["b1"] }], recipe: { title: "Synthetische KI-Prüfung", titleBlockIds: ["b1"], servings: null, servingsRaw: null, servingsBlockIds: [], ingredients: [{ amount: "1", unit: null, name: "Apfel", blockIds: ["b1"] }], equipment: [], steps: [{ text: "In die Pfanne geben, falls nötig.", blockIds: ["b1"] }], notes: [], excludedBlocks: [] } });
  } finally { db.close(); }
  const draft = { title: "Synthetische KI-Prüfung", servings: "", transcription: "1 Apfel. In die Pfanne geben, falls nötig.", ingredients: "1 | Stück | Apfel", equipment: "", steps: "In die Pfanne geben, falls nötig.", confirmed: true };
  const rejected = await request.post(`${base}/api/analysis/${id}`, { headers: { Origin: base, Authorization: `Bearer ${token}` }, data: { action: "confirm", draft, resolutions: {} } });
  expect(rejected.status()).toBe(422);
  await page.goto(base);
  await page.evaluate(({ id, token }) => localStorage.setItem("digitales-rezeptbuch-analysis-job-v1", JSON.stringify({ id, token })), { id, token });
  await page.getByRole("button", { name: "Rezept hinzufügen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dein Rezept ist bereit.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Geprüft speichern", exact: true })).toBeDisabled();
  await page.getByLabel("Klärung: 1 oder 7 Äpfel?", { exact: true }).fill("Im synthetischen Original 1 Apfel geprüft.");
  await page.getByRole("button", { name: "Geprüft speichern", exact: true }).click();
  await expect(page.getByRole("heading", { name: draft.title, exact: true })).toBeVisible();
  const status = await request.get(`${base}/api/analysis/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  expect((await status.json()).state).toBe("confirmed");
  const savedSource = await request.get(`${base}/api/analysis/${id}?source=1`, { headers: { Authorization: `Bearer ${token}` } });
  expect(Buffer.from(await savedSource.body())).toEqual(png);
});
