import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { authorize, claimJob, confirmJob, enqueue, localRequest, openJobs, publishResult } from "./analysis-server.ts";
import { validateAnalysis } from "./analysis-contract.ts";
import { inspectSource, analysisImage } from "./source-validation.ts";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

const analysis = { status: "recipe" as const, blocks: [{ id: "b1", page: 1, text: "Synthetische Testquelle: 1 oder 7 Äpfel. Braten, falls nötig." }], issues: [{ id: "i1", message: "1 oder 7?", blockIds: ["b1"] }] };
const reviewed = { title: "Künstlicher Test", servings: "", transcription: "1 Apfel. Braten, falls nötig.", ingredients: "1 | Stück | Apfel", equipment: "", steps: "Braten, falls nötig.", confirmed: true };
function add(db: ReturnType<typeof openJobs>) {
  const id = randomUUID(), token = randomUUID();
  const input = { id, token, source: new Uint8Array([1, 2, 3]), name: "synthetisch.png", mime: "image/png", pages: 1, model: "synthetic-no-api" };
  enqueue(db, input); return input;
}
test("persisted queue deduplicates, protects capabilities and reserves daily calls", () => {
  const db = openJobs(":memory:");
  try {
    const input = add(db); enqueue(db, input);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as { n: number }).n, 1);
    assert.equal(authorize(db, input.id, randomUUID()), undefined);
    assert.ok(authorize(db, input.id, input.token));
    assert.ok(claimJob(db, 1));
    assert.equal(claimJob(db, 1), undefined);
    const next = add(db);
    assert.equal(claimJob(db, 1), undefined);
    assert.equal(authorize(db, next.id, next.token)?.state, "failed");
  } finally { db.close(); }
});
test("review blocks open issues and confirmation is immutable and idempotent", () => {
  const db = openJobs(":memory:");
  try {
    const input = add(db); const job = claimJob(db, 5)!;
    assert.throws(() => confirmJob(db, authorize(db, input.id, input.token)!, reviewed, {}), /nicht zur Freigabe/);
    publishResult(db, job, analysis);
    assert.throws(() => confirmJob(db, authorize(db, input.id, input.token)!, reviewed, {}), /Lesefragen/);
    const recipe = confirmJob(db, authorize(db, input.id, input.token)!, reviewed, { i1: "Im Original 1, vom Nutzer verglichen." });
    assert.equal(recipe.servings, null);
    assert.equal(recipe.sourceText, reviewed.transcription);
    const again = confirmJob(db, authorize(db, input.id, input.token)!, { ...reviewed, title: "Manipuliert" }, {});
    assert.deepEqual(again, recipe);
  } finally { db.close(); }
});
test("cancelled jobs cannot publish late results, stale calls are not retried", () => {
  const db = openJobs(":memory:");
  try {
    const input = add(db); const job = claimJob(db, 5)!;
    db.prepare("UPDATE jobs SET state='cancelled' WHERE id=?").run(input.id);
    publishResult(db, job, analysis);
    assert.equal(authorize(db, input.id, input.token)?.result, null);
    const stale = add(db); claimJob(db, 5);
    db.prepare("UPDATE jobs SET started='2000-01-01T00:00:00.000Z' WHERE id=?").run(stale.id);
    claimJob(db, 5);
    assert.equal(authorize(db, stale.id, stale.token)?.state, "failed");
  } finally { db.close(); }
});
test("unknown source blocks, duplicate IDs and pages outside upload are rejected", () => {
  assert.throws(() => validateAnalysis({ ...analysis, issues: [{ ...analysis.issues[0], blockIds: ["foreign"] }] }, 1));
  assert.throws(() => validateAnalysis({ ...analysis, blocks: [...analysis.blocks, ...analysis.blocks] }, 1));
  assert.throws(() => validateAnalysis({ ...analysis, blocks: [{ ...analysis.blocks[0], page: 2 }] }, 1));
});
test("local API rejects foreign origins, public hostnames and forwarded host mismatch", () => {
  assert.equal(localRequest(new Request("http://localhost:3000/api/analysis", { method: "POST", headers: { host: "localhost:3000", origin: "https://evil.example" } })), false);
  assert.equal(localRequest(new Request("https://example.com/api/analysis", { headers: { host: "example.com" } })), false);
  assert.equal(localRequest(new Request("http://localhost:3000/api/analysis", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000", "x-forwarded-host": "localhost:3000" } })), true);
});
test("source signatures, page limits and EXIF removal are checked with synthetic files", async () => {
  const png = await sharp({ create: { width: 80, height: 80, channels: 3, background: "white" } }).png().withMetadata().toBuffer();
  assert.deepEqual(await inspectSource(png, "image/png"), { pages: 1 });
  await assert.rejects(inspectSource(png, "image/jpeg"));
  const copy = await analysisImage(png);
  assert.equal((await sharp(copy).metadata()).exif, undefined);
  await assert.rejects(inspectSource(new Uint8Array([1, 2]), "application/pdf"));
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 11; i++) pdf.addPage();
  await assert.rejects(inspectSource(await pdf.save(), "application/pdf"), /1 bis 10/);
});
