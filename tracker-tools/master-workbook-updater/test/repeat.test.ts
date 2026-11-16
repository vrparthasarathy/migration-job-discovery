import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { download, listFiles, ok, reviews, rowsOf, RUN_DATE, setup, textOf, vendorRows, type Env, type RVP } from "./support.ts";

const RVS: RVP[] = [
  { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", proposals: "TP-1", fields: { stage: ["sent", "review", "update"] } },
  { tab: "Use Cases", record: "UC-002", useCase: "Nightly Sync", status: "rejected", fields: { stage: ["sent", "review", "update"] } },
  { tab: "Questions", ref: "QN-0005", key: "Daily Report/Q9", useCase: "Daily Report", proposals: "TP-2", fields: { question_text: ["", "Which currency?", "add"] } },
];

const FLAGS = (env: Env, acme: string): string[] => ["--reviews", env.reviews, "--vendor", `Acme=${acme}`, "--new-vendor", "Beta", "--vendor-out", env.vendorOut];

test("[B8] the same inputs and run date give identical bytes, and no input is overwritten or left as a temporary file", async () => {
  const env = await setup();
  const acme = await download(env, "acme.xlsx", "Acme", vendorRows("Acme"));
  await reviews(env, RVS);
  const inputs = [env.master, acme];
  const before = await Promise.all(inputs.map((f) => readFile(f)));
  const rejectedBefore = await textOf(join(env.reviews, "review-use-cases.csv"));

  await ok(env, ...FLAGS(env, acme));
  const first = { master: await readFile(env.out), acme: await readFile(join(env.vendorOut, "Acme.xlsx")), beta: await readFile(join(env.vendorOut, "Beta.xlsx")), report: await readFile(env.report) };
  assert.deepEqual(await Promise.all(inputs.map((f) => readFile(f))), before);
  assert.deepEqual((await listFiles(env.root)).filter((f) => f.endsWith(".tmp")), []);
  const applied = (await textOf(join(env.reviews, "review-use-cases.csv"))).split("\n");
  assert.equal(applied.length, rejectedBefore.split("\n").length);
  assert.match(applied[1]!, new RegExp(`${RUN_DATE},?$`));
  assert.equal(applied[2], rejectedBefore.split("\n")[2]);

  await reviews(env, RVS);
  const second: Env = { ...env, out: join(env.root, "two", "master.xlsx"), report: join(env.root, "two", "report.md"), vendorOut: join(env.root, "two", "vendors") };
  await ok(second, ...FLAGS(second, acme));
  assert.deepEqual(await readFile(second.out), first.master);
  assert.deepEqual(await readFile(join(second.vendorOut, "Acme.xlsx")), first.acme);
  assert.deepEqual(await readFile(join(second.vendorOut, "Beta.xlsx")), first.beta);
  assert.deepEqual((await readFile(second.report)).toString().replaceAll("two", "out"), first.report.toString());
});

test("[B9] running again on its own output with the same reviews and vendor files changes nothing and adds no row", async () => {
  const env = await setup();
  const acme = await download(env, "acme.xlsx", "Acme", vendorRows("Acme"));
  await reviews(env, RVS);
  await ok(env, ...FLAGS(env, acme));
  const marked = await Promise.all(["review-use-cases.csv", "review-questions.csv"].map((f) => textOf(join(env.reviews, f))));

  const again: Env = { ...env, master: env.out, out: join(env.root, "again", "master.xlsx"), report: join(env.root, "again", "report.md"), vendorOut: join(env.root, "again", "vendors") };
  await ok(again, ...FLAGS(again, acme));
  assert.deepEqual(await readFile(again.out), await readFile(env.out));
  assert.deepEqual(await Promise.all(["review-use-cases.csv", "review-questions.csv"].map((f) => textOf(join(env.reviews, f)))), marked);
  assert.equal((await rowsOf(again.out, "Questions")).length, 5);
  assert.match(await textOf(again.report), /Review rows: 3 = 0 applied \+ 3 skipped/);
  assert.match(await textOf(again.report), /2 x already applied/);
});

test("[B9] a row marked applied whose values are not in the master is listed", async () => {
  const env = await setup();
  await reviews(env, [
    { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", appliedOn: "2026-11-18", fields: { stage: ["sent", "review", "update"] } },
    { tab: "Questions", ref: "QN-0005", key: "x", useCase: "Daily Report", appliedOn: "2026-11-18", fields: { question_text: ["", "Which currency?", "add"] } },
    { tab: "Use Cases", record: "UC-002", useCase: "Nightly Sync", appliedOn: "2026-11-18", fields: { stage: ["sent", "sent", "update"] } },
  ]);
  await ok(env, "--reviews", env.reviews);
  assert.equal((await rowsOf(env.out, "Use Cases"))[0]!.stage, "sent");
  const report = await textOf(env.report);
  assert.match(report, /## Marked applied, not in the master\n\n- Use Cases, UC-001 .*stage is "sent", not "review"\n- Questions, x .*the master has no row QN-0005\n\n/);
  assert.match(report, /3 x already applied/);
});
