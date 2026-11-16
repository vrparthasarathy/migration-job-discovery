import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { looksSecret } from "../../tracker-tools/tracker-reconciler/src/secrets.ts";
import { fixtures, pack, schemaPath, steps } from "./support.ts";

async function files(): Promise<string[]> {
  const entries = await readdir(fixtures, { recursive: true, withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)).sort();
}

test("[B09] the fixtures hold no copy of the contract or the schema, by name or by content", async () => {
  const contract = (await readFile(join(pack, "tracker-data-contract", "tracker-data-contract.md"), "utf8")).split("\n")[0]!;
  const schemaHeader = (await readFile(schemaPath, "utf8")).split("\n")[0]!;
  for (const file of await files()) {
    const name = relative(fixtures, file);
    assert.doesNotMatch(name.toLowerCase(), /tracker-data-contract\.md$|tracker-schema\.csv$/, `${name}: a copy of the contract or schema by name`);
    const text = await readFile(file, "utf8");
    assert.equal(text.includes(contract), false, `${name}: holds the contract's title line`);
    assert.notEqual(text.split("\n")[0], schemaHeader, `${name}: starts with the schema's header line`);
  }
});

test("[B09] the fixtures are text only: CSV, Markdown and one fictional script, with no binary and no secret-looking value", async () => {
  for (const file of await files()) {
    const name = relative(fixtures, file);
    assert.ok([".csv", ".md", ".py", ".txt"].includes(extname(file)), `${name}: a file type that is not text`);
    const buffer = await readFile(file);
    assert.equal(buffer.includes(0), false, `${name}: has a binary byte`);
    const text = buffer.toString("utf8");
    for (const [i, line] of text.split("\n").entries()) {
      const cells = extname(file) === ".csv" ? line.split(",").map((c) => c.replace(/^"|"$/g, "")) : [line];
      for (const cell of cells) assert.equal(looksSecret(cell), false, `${name}: line ${i + 1} looks like a secret`);
    }
  }
});

test("[B09] the fixtures are fictional: the vendor Harborline, no address, link or real-looking name", async () => {
  for (const file of await files()) {
    const name = relative(fixtures, file);
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /https?:\/\/|@[a-z0-9-]+\.[a-z]{2,}/i, `${name}: a link or an email address`);
  }
  const code = await readFile(join(fixtures, "harborline", "refund-retry", "refund_retry.py"), "utf8");
  assert.match(code, /fictional example, not a real script/);
  assert.match(await readFile(join(fixtures, "harborline", "refund-retry", "external_tools.md"), "utf8"), /\(fictional\)/);
});

test("[B09] there is a reference output for every step of the sheet, and every output named by the sheet exists", async () => {
  const all = await steps();
  assert.equal(all.length, 16, "the sheet has its sixteen steps");
  const names = new Set((await files()).map((f) => relative(fixtures, f)));
  for (const s of all) {
    const mentioned = [...s.fields["Expected result"]!.matchAll(/`((?:expected|reference-proposals(?:-v2)?|vendor-answer)\/[^`]+)`/g)].map((m) => m[1]!);
    assert.ok(mentioned.length > 0, `${s.id}: no reference output named`);
    for (const m of mentioned) assert.ok(names.has(m) || [...names].some((n) => n.startsWith(m)), `${s.id}: ${m} is not in fixtures/`);
  }
  const expectedNames = [...names].filter((n) => n.startsWith("expected/")).map((n) => n.slice("expected/".length));
  for (const required of ["use-case-index.csv", "s03-review-rows.csv", "s04-decisions-final.csv", "s05-master.csv", "s06-master.csv", "s06b-vendor.csv", "s08-master.csv", "s09-master.csv", "summary.md", "export-after-answer/manifest.csv", "export-after-answer/questions.csv"]) {
    assert.ok(expectedNames.includes(required), `expected/${required} is missing`);
  }
});
