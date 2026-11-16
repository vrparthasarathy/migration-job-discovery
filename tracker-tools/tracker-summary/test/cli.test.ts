import { test } from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run } from "../src/cli.ts";
import { baseExport } from "./fixtures.ts";
import { DATE, fixture, section, snapshot, summarize, type Export } from "./support.ts";

type Fixture = Awaited<ReturnType<typeof fixture>>;

/** Runs the command and checks it stopped: exit 1, every pattern in the messages, no output file and no change to the export. */
async function failsWith(f: Fixture, extra: string[] | undefined, ...patterns: RegExp[]): Promise<string> {
  const before = await snapshot(f.exportDir);
  const outcome = await summarize(f.exportDir, f.out, extra);
  assert.equal(outcome.status, 1, `expected exit 1: ${outcome.stdout}`);
  assert.equal(outcome.stdout, "");
  for (const pattern of patterns) assert.match(outcome.stderr, pattern);
  await assert.rejects(access(f.out), "no partial summary is written");
  assert.deepEqual(await snapshot(f.exportDir), before, "the export is never changed");
  return outcome.stderr;
}

test("[B08] a missing tab file is an error naming the file", async () => {
  const f = await fixture(baseExport());
  await rm(join(f.exportDir, "questions.csv"));
  await failsWith(f, undefined, /questions\.csv: cannot read file \(ENOENT\)/);
});

test("[B08] a missing manifest is an error naming the file", async () => {
  const f = await fixture(baseExport());
  await rm(join(f.exportDir, "manifest.csv"));
  await failsWith(f, undefined, /manifest\.csv: cannot read file \(ENOENT\)/);
});

test("[B08] a manifest without its columns is an error naming each column", async () => {
  const f = await fixture(baseExport());
  await writeFile(join(f.exportDir, "manifest.csv"), "scope,workbook\ninternal,master.xlsx\n");
  await failsWith(f, undefined, /manifest\.csv: missing column "exported_at"/, /manifest\.csv: missing column "exported_by"/);
});

test("[B08] a missing column is an error naming the file and column", async () => {
  const f = await fixture(baseExport(), { Questions: ["due_on", "blocks_mapping"], "Use Cases": ["source_status"] });
  const stderr = await failsWith(f, undefined, /questions\.csv: missing column "due_on"/, /questions\.csv: missing column "blocks_mapping"/, /use-cases\.csv: missing column "source_status"/);
  assert.doesNotMatch(stderr, /mappings\.csv/);
});

test("[B08] an invalid status is reported with the file, row, field and value", async () => {
  const data = baseExport();
  data.Questions![1]!.answer_status = "half-done";
  data["Use Cases"]![0]!.source_status = "maybe";
  const f = await fixture(data);
  await failsWith(f, undefined, /questions\.csv: row 3: answer_status: "half-done" is not one of/, /use-cases\.csv: row 2: source_status: "maybe" is not one of/);
});

test("[B08] an invalid date in a tab is reported with the file, row and field", async () => {
  const data = baseExport();
  data.Questions![0]!.released_on = "09/11/2026";
  await failsWith(await fixture(data), undefined, /questions\.csv: row 2: released_on: "09\/11\/2026" is not a date/);
});

test("[B08] a file that is not valid CSV is an error naming the file", async () => {
  const f = await fixture(baseExport());
  await writeFile(join(f.exportDir, "mappings.csv"), 'mapping_ref,use_case_ref\n"MP-001,UC-001\n');
  await failsWith(f, undefined, /mappings\.csv: unterminated quoted field/);
});

test("[B08] a bad date, a missing holidays file or a bad holidays file stops the run", async () => {
  const f = await fixture(baseExport());
  await failsWith(f, ["--date", "16-11-2026"], /date "16-11-2026" is not YYYY-MM-DD/);
  await failsWith(f, ["--date", DATE, "--holidays", join(f.dir, "none.txt")], /none\.txt/);
  const bad = join(f.dir, "bad.txt");
  await writeFile(bad, "2026-11-10\nsoon\n");
  await failsWith(f, ["--date", DATE, "--holidays", bad], /bad\.txt: line 2: "soon" is not YYYY-MM-DD/);
});

test("[B08] a missing or unknown option, an extra argument or a bad output path stops the run with the usage", async () => {
  const f = await fixture(baseExport());
  await failsWith(f, ["--date"], /--date needs a value/, /usage: summary --export/);
  await failsWith(f, ["--colour", "red"], /unknown option "--colour"/);
  await failsWith(f, ["extra"], /unexpected argument "extra"/);
  let stderr = "";
  assert.equal(await run(["--export", f.exportDir], { out: () => {}, err: (t) => (stderr += t) }), 1);
  assert.match(stderr, /summary needs --out/);
  stderr = "";
  assert.equal(await run([], { out: () => {}, err: (t) => (stderr += t) }), 1);
  assert.match(stderr, /summary needs --export/);
  const inside = await summarize(f.exportDir, join(f.exportDir, "summary.md"));
  assert.equal(inside.status, 1);
  assert.match(inside.stderr, /--out must not be inside the export folder/);
  const directory = join(f.dir, "a-folder");
  await mkdir(directory);
  assert.equal((await summarize(f.exportDir, directory)).status, 1);
});

test("[B09] the sections follow the call agenda and the output is marked internal", async () => {
  const f = await fixture(baseExport());
  const { summary } = await summarize(f.exportDir, f.out);
  const lines = summary.split("\n");
  assert.equal(lines[0], `# Tracker summary ${DATE}`);
  assert.equal(lines[1], "INTERNAL: for the lead's call only; never share it with a vendor.");
  assert.deepEqual(
    lines.filter((l) => l.startsWith("## ")),
    ["## 1. Status", "## 2. Overdue questions", "## 3. Pending acknowledgements", "## 4. Missing source and other blockers", "## 5. Identity and access", "## 6. Mappings", "## 7. Next batches and capacity", "## 8. Unassigned"],
  );
});

test("[B09] the tracks are the vendors found in the data, with no vendor named in the tool", async () => {
  const data: Export = baseExport();
  for (const row of data["Use Cases"]!) row.vendor = { alpha: "north", beta: "south", gamma: "east" }[row.vendor!]!;
  const f = await fixture(data);
  const { summary } = await summarize(f.exportDir, f.out);
  const status = section(summary, "1. Status");
  assert.match(status, /\| east \|[^\n]*\n\| north \|[^\n]*\n\| south \|/);
  assert.doesNotMatch(status, /alpha|beta|gamma/);
});

test("[B10] the same export and date give byte-identical output and leave the export unchanged", async () => {
  const f = await fixture(baseExport());
  const before = await snapshot(f.exportDir);
  const first = await summarize(f.exportDir, f.out);
  const second = await summarize(f.exportDir, join(f.dir, "again.md"));
  assert.equal(first.status, 0);
  assert.equal(first.summary, second.summary);
  assert.match(first.stdout, /wrote .*summary\.md/);
  assert.deepEqual(await snapshot(f.exportDir), before);
});

test("[B10] without a date it uses today, and a later date changes the age of an answer awaiting review", async () => {
  const f = await fixture(baseExport());
  const implied = await summarize(f.exportDir, f.out, [], () => DATE);
  const explicit = await summarize(f.exportDir, join(f.dir, "explicit.md"));
  assert.equal(implied.summary, explicit.summary);
  const real = await summarize(f.exportDir, join(f.dir, "real.md"), []);
  assert.equal(real.status, 0);
  assert.match(real.summary, new RegExp(`^# Tracker summary ${new Date().toISOString().slice(0, 10)}\n`));
  const later = await summarize(f.exportDir, join(f.dir, "later.md"), ["--date", "2026-11-17"]);
  assert.match(later.summary, /QN-0006 .* age 4 days/);
});
