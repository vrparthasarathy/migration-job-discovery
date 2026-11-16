import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../src/cli.ts";
import { baseExport } from "./fixtures.ts";
import { cli, examplePath, fixture, proposalText, PROPOSAL_HEADER, put, reconcile, snapshot, writeExport, writeProposal, type Fixture, type PRow } from "./support.ts";

const good: PRow = { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "current_version", value: "2", base: "1" };

/** A proposal file whose rows come from `proposalText` and may be replaced by raw lines. */
async function withProposal(rawLines: string[], header = PROPOSAL_HEADER.join(",")): Promise<Fixture> {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await put(join(f.proposals, "mr-1", "tracker-updates.csv"), [header, ...rawLines].join("\n") + "\n");
  return f;
}

const line = (row: Partial<PRow> = {}, id = "mr-1"): string => proposalText(id, [{ ...good, ...row }]).split("\n")[1]!;

async function failsWith(f: Fixture, ...patterns: RegExp[]): Promise<string> {
  const exportBefore = await snapshot(f.exportDir);
  const outBefore = await snapshot(f.out);
  const outcome = await reconcile(f);
  assert.equal(outcome.status, 1, `expected exit 1, got ${outcome.status}: ${outcome.stdout}`);
  for (const pattern of patterns) assert.match(outcome.stderr, pattern);
  assert.deepEqual(await snapshot(f.out), outBefore, "no partial output is written");
  assert.deepEqual(await snapshot(f.exportDir), exportBefore, "inputs are never written");
  return outcome.stderr;
}

test("[B09] a bad proposal header names the file and line 1 and writes nothing", async () => {
  const f = await withProposal([line()], PROPOSAL_HEADER.slice(0, 11).join(","));
  await failsWith(f, /tracker-updates\.csv: line 1: .*header/);
});

test("[B09] an unknown tab or field names the file and line", async () => {
  const f = await withProposal([line(), line({ tab: "Nonsense" }), line({ key: "uc-acme-daily-report", field: "no_such_field" })]);
  const stderr = await failsWith(f, /tracker-updates\.csv: line 3: .*Nonsense.*known tabs.*Use Cases/, /tracker-updates\.csv: line 4: .*no_such_field/);
  assert.equal(stderr.includes("line 2"), false);
});

test("[B09] an unknown use case ID, a name key or a slug key names the file, line and expected form", async () => {
  const f = await withProposal([
    line(),
    line({ tab: "Questions", op: "add", key: "uc-ghost-case/Q1", field: "use_case_name", value: "Ghost Case" }),
    line({ tab: "Use Cases", key: "uc-ghost-phantom", field: "current_version" }),
    line({ tab: "Use Cases", key: "Daily Report", field: "current_version" }),
    line({ tab: "Questions", op: "add", key: "daily-report/Q1", field: "use_case_name", value: "Daily Report" }),
  ]);
  await failsWith(
    f,
    /line 3: .*unknown use case ID in record_key "uc-ghost-case\/Q1"; expected uc-<vendor-slug>-<use-case-slug>/,
    /line 4: .*unknown use case ID in record_key "uc-ghost-phantom"/,
    /line 5: .*unknown use case ID in record_key "Daily Report"/,
    /line 6: .*unknown use case ID in record_key "daily-report\/Q1"/,
  );
});

test("[B09] a use_case_name value that does not belong to the key's use case ID names the file and line", async () => {
  const f = await withProposal([line(), line({ tab: "Questions", op: "add", key: "uc-acme-daily-report/Q8", field: "use_case_name", value: "Nightly Sync" })]);
  await failsWith(f, /line 3: .*use_case_name "Nightly Sync" does not belong to use case ID uc-acme-daily-report/);
});

test("[B09] two export Use Cases rows that derive one use case ID stop the run naming the export file and both lines", async () => {
  const data = baseExport();
  data["Use Cases"]!.push({ use_case_ref: "UC-004", use_case_name: "Daily  Report", vendor: "ACME", current_version: "1" });
  const f = await withProposal([line()]);
  await writeExport(f.exportDir, data);
  await failsWith(f, /use-cases\.csv: line 5: use case ID uc-acme-daily-report is also derived by line 2; make the vendor or the name differ/);
});

test("[B09] a use case added in the proposals is a known ID for the rows that follow it", async () => {
  const f = await withProposal([
    line({ tab: "Use Cases", op: "add", key: "uc-acme-fresh-case", field: "use_case_name", value: "Fresh Case" }),
    line({ tab: "Use Cases", op: "add", key: "uc-acme-bare-case", field: "vendor", value: "Acme" }),
    line({ tab: "Questions", op: "add", key: "uc-acme-fresh-case/Q1", field: "use_case_name", value: "Fresh Case" }),
    line({ tab: "Questions", op: "add", key: "uc-acme-bare-case/Q1", field: "use_case_name", value: "Whatever" }),
  ]);
  assert.equal((await reconcile(f)).status, 0);
});

test("[B09] a malformed CSV names the file and the line where the quote was left open", async () => {
  const f = await withProposal([line(), `a,"never closed,b`, "more,text"]);
  await failsWith(f, /tracker-updates\.csv: line 3: .*unterminated/);
  const g = await withProposal([line(), line() + ",extra,fields"]);
  await failsWith(g, /tracker-updates\.csv: line 3: .*fields/);
  const h = await withProposal([`"first","quoted"\r"second,open`]);
  await failsWith(h, /line 3: .*unterminated/);
  const i = await withProposal([`"has ""inner"" quote",x`, `"multi`, "line", `value`]);
  await failsWith(i, /line 3: .*unterminated/);
  const k = await withProposal([`a,b\r\n"open,quote`]);
  await failsWith(k, /line 3: .*unterminated/);
  const j = await withProposal([line()]);
  await put(join(j.exportDir, "questions.csv"), "question_ref,question_ref\nQN-0001,QN-0001\n");
  await failsWith(j, /questions\.csv: line 1: .*duplicate/);
});

test("[B09] a secret-looking value stops the run, names the file and line and is never echoed", async () => {
  const secrets = ["api_key=AbCd1234efgh", "password: hunter2hunter2", "-----BEGIN RSA PRIVATE KEY-----", "AKIAABCDEFGHIJKLMNOP", `ghp_${"a1".repeat(12)}`, `xoxb-${"1234567890"}-abc`, `Bearer ${"abcdef0123456789"}abcdef`, `sk-${"Ab1".repeat(8)}`];
  for (const secret of secrets) {
    const f = await withProposal([line(), line({ tab: "Use Cases", op: "suggest", key: "uc-acme-daily-report", field: "next_action", value: `use ${secret} now` })]);
    const stderr = await failsWith(f, /tracker-updates\.csv: line 3: .*secret-looking value in "value"/);
    assert.equal(stderr.includes(secret), false, "the secret is not echoed");
  }
  const clean = await withProposal([line({ tab: "Use Cases", op: "suggest", key: "uc-acme-daily-report", field: "next_action", value: "Reset the password through the portal" })]);
  assert.equal((await reconcile(clean)).status, 0);
});

test("[B09] a row that breaks the proposal format names the file and line", async () => {
  const f = await withProposal([
    line(),
    line({ op: "replace" }),
    line().replace("mr-1:Use Cases:uc-acme-daily-report:current_version", "other:id"),
    line({ created: "18/11/2026" }),
    line({ source: "" }),
    line({ key: "" }),
    line({ tab: "Use Cases", op: "suggest", key: "uc-acme-daily-report", field: "our_owner", value: "Zed" }),
    line({ tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "last_change_class", value: "sideways", base: "" }),
  ]);
  const stderr = await failsWith(f, /line 3: .*operation "replace"/, /line 4: .*update_id/, /line 5: .*created_on/, /line 6: .*source/, /line 7: .*record_key/);
  assert.equal(stderr.includes("line 2"), false);
  assert.equal(/line (8|9)\b/.test(stderr), false, "a well-formed row with a poor value is rejected row by row, not a bad input");
});

test("[B09] a duplicate update_id across two proposal files is an input error naming both lines", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await writeProposal(f.proposals, "mr-1", [good]);
  await put(join(f.proposals, "copy", "tracker-updates.csv"), proposalText("mr-1", [good]));
  await failsWith(f, /mr-1[/\\]tracker-updates\.csv: line 2: duplicate update_id.*copy[/\\]tracker-updates\.csv line 2/);
});

test("[B09] a bad export names its file and line: an out-of-list value, a missing key column, a secret, a bad manifest or no manifest", async () => {
  const data = baseExport();
  data.Questions![1] = { ...data.Questions![1]!, status: "bogus" };
  const f = await fixture();
  await writeExport(f.exportDir, data);
  await writeProposal(f.proposals, "mr-1", [good]);
  await failsWith(f, /questions\.csv: line 3: status.*bogus/);

  const noKey = await fixture();
  await writeExport(noKey.exportDir, baseExport());
  await put(join(noKey.exportDir, "questions.csv"), "use_case_ref,status\nUC-001,released\n");
  await writeProposal(noKey.proposals, "mr-1", [good]);
  await failsWith(noKey, /questions\.csv: line 1: question_ref.*missing/);

  const secret = await fixture();
  const withSecret = baseExport();
  withSecret["Use Cases"]![0] = { ...withSecret["Use Cases"]![0]!, notes_internal: "token=abcd1234efgh5678" };
  await writeExport(secret.exportDir, withSecret);
  await writeProposal(secret.proposals, "mr-1", [good]);
  const stderr = await failsWith(secret, /use-cases\.csv: line 2: .*secret-looking value in "notes_internal"/);
  assert.equal(stderr.includes("abcd1234efgh5678"), false);

  const badManifest = await fixture();
  await writeExport(badManifest.exportDir, baseExport(), [{ scope: "internal", workbook: "m.xlsx", exported_at: "yesterday", exported_by: "x" }]);
  await writeProposal(badManifest.proposals, "mr-1", [good]);
  await failsWith(badManifest, /manifest\.csv: line 2: exported_at/);

  const noScope = await fixture();
  await writeExport(noScope.exportDir, baseExport(), [{ scope: "acme", workbook: "m.xlsx", exported_at: "2026-11-20", exported_by: "x" }]);
  await writeProposal(noScope.proposals, "mr-1", [good]);
  await failsWith(noScope, /manifest\.csv: .*scope "internal"/);

  const noHeader = await fixture();
  await writeExport(noHeader.exportDir, baseExport());
  await put(join(noHeader.exportDir, "manifest.csv"), "scope,workbook\ninternal,m.xlsx\n");
  await writeProposal(noHeader.proposals, "mr-1", [good]);
  await failsWith(noHeader, /manifest\.csv: line 1: .*exported_at/);

  const noManifest = await fixture();
  await mkdir(noManifest.exportDir, { recursive: true });
  await writeProposal(noManifest.proposals, "mr-1", [good]);
  await failsWith(noManifest, /manifest\.csv: cannot read/);
});

test("[B09] a missing proposals folder, a missing export folder and an empty proposals folder stop the run", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await failsWith(f, /proposals.*cannot read/);
  await mkdir(f.proposals, { recursive: true });
  await failsWith(f, /no tracker-updates\.csv/);
});

test("[B09] an output folder that is not a previous reconciler output, or that overlaps an input, is refused", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await writeProposal(f.proposals, "mr-1", [good]);
  await put(join(f.out, "precious.txt"), "keep me");
  await failsWith({ ...f }, /output folder.*not empty/);
  assert.deepEqual(await snapshot(f.out), { "/precious.txt": "keep me" });
  await failsWith({ ...f, out: f.exportDir }, /output folder.*overlaps/);
  await failsWith({ ...f, out: join(f.proposals, "inside") }, /output folder.*overlaps/);
  await failsWith({ ...f, out: f.root }, /output folder.*overlaps/);
  await put(join(f.out, "reconciliation-report.md"), "old report");
  await failsWith({ ...f }, /output folder.*not empty/);
  assert.equal((await snapshot(f.out))["/precious.txt"], "keep me");
  await rm(join(f.out, "precious.txt"));
  await put(join(f.out, "vendor", "acme", "notes.md"), "my own notes");
  await failsWith({ ...f }, /output folder.*not empty/);
  assert.equal((await snapshot(f.out))["/vendor/acme/notes.md"], "my own notes");
  await rm(join(f.out, "vendor"), { recursive: true });
  await put(join(f.root, "afile.txt"), "a file, not a folder");
  await failsWith({ ...f, out: join(f.root, "afile.txt") }, /output folder.*cannot be used \(ENOTDIR\)/);
});

test("[B09] an input error leaves the output of an earlier run exactly as it was", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await writeProposal(f.proposals, "mr-1", [good]);
  assert.equal((await reconcile(f)).status, 0);
  const earlier = await snapshot(f.out);
  await put(join(f.proposals, "mr-1", "tracker-updates.csv"), [PROPOSAL_HEADER.join(","), line({ tab: "Nonsense" })].join("\n") + "\n");
  const outcome = await reconcile(f);
  assert.equal(outcome.status, 1);
  assert.deepEqual(await snapshot(f.out), earlier);
});

test("[B09] usage errors exit 1 with a message and write nothing", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await writeProposal(f.proposals, "mr-1", [good]);
  const attempts: [string[], RegExp][] = [
    [[], /usage/i],
    [["frobnicate"], /unknown command "frobnicate"/],
    [["reconcile", "--export", f.exportDir, "--out", f.out], /--proposals/],
    [["reconcile", "--proposals", f.proposals, "--out", f.out], /--export/],
    [["reconcile", "--export", f.exportDir, "--proposals", f.proposals], /--out/],
    [["reconcile", "--export", f.exportDir, "--proposals", f.proposals, "--out"], /--out needs a value/],
    [["reconcile", "--export", f.exportDir, "--proposals", f.proposals, "--out", f.out, "--bogus", "x"], /unknown option "--bogus"/],
    [["reconcile", "--export", f.exportDir, "--proposals", f.proposals, "--out", f.out, "stray"], /unexpected argument "stray"/],
    [["validate"], /validate needs one file or folder/],
    [["validate", "a", "b"], /validate needs one file or folder/],
  ];
  for (const [args, pattern] of attempts) {
    const outcome = await cli(...args);
    assert.equal(outcome.status, 1, args.join(" "));
    assert.match(outcome.stderr, pattern);
    assert.equal(outcome.stdout, "");
  }
  assert.deepEqual(await snapshot(f.out), {});
});

test("[B09] validate checks a proposal file or an export and proposal folder, names file and line, and writes nothing", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  const dir = await writeProposal(f.proposals, "mr-1", [good, { ...good, field: "spec_revision", value: "abc", base: "" }]);
  const file = await cli("validate", join(dir, "tracker-updates.csv"));
  assert.deepEqual([file.status, file.stderr], [0, ""]);
  assert.match(file.stdout, /tracker-updates\.csv: ok/);
  const exportOnly = await cli("validate", f.exportDir);
  assert.equal(exportOnly.status, 0, exportOnly.stderr);
  assert.match(exportOnly.stdout, /manifest\.csv: ok/);
  const all = await cli("validate", f.root);
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stdout, /manifest\.csv: ok[\s\S]*tracker-updates\.csv: ok/);

  await put(join(f.proposals, "mr-2", "tracker-updates.csv"), [PROPOSAL_HEADER.join(","), line({ tab: "Nonsense" }, "mr-2")].join("\n") + "\n");
  await mkdir(join(f.root, "blank"));
  const before = await snapshot(f.root);
  const bad = await cli("validate", join(f.proposals, "mr-2", "tracker-updates.csv"));
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /tracker-updates\.csv: line 2: .*Nonsense/);
  const badDir = await cli("validate", f.proposals);
  assert.equal(badDir.status, 1);
  assert.match(badDir.stderr, /mr-2[/\\]tracker-updates\.csv: line 2/);
  assert.equal(badDir.stdout.includes("mr-1"), false, "nothing is reported ok when the run fails");

  const missing = await cli("validate", join(f.root, "nowhere"));
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /nowhere.*cannot read/);
  const nothing = await cli("validate", join(f.root, "export", "empty-sub"));
  assert.equal(nothing.status, 1);
  const blank = await cli("validate", join(f.root, "blank"));
  assert.equal(blank.status, 1);
  assert.match(blank.stderr, /nothing to validate/);
  assert.deepEqual(await snapshot(f.root), before);
});

test("[B09] the command line adapter exits with the run's status", () => {
  const main = fileURLToPath(new URL("../src/main.ts", import.meta.url));
  const usage = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /usage/i);
  const ok = spawnSync(process.execPath, [main, "validate", examplePath], { encoding: "utf8" });
  assert.deepEqual([ok.status, ok.stderr], [0, ""]);
  assert.match(ok.stdout, /tracker-updates\.csv: ok/);
});

test("[B09] an unexpected failure exits 1 with its message instead of a stack", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await writeProposal(f.proposals, "mr-1", [good]);
  let stderr = "";
  const status = await run(["reconcile", "--export", f.exportDir, "--proposals", f.proposals, "--out", f.out], {
    out: () => {
      throw new Error("standard output is closed");
    },
    err: (text) => (stderr += text),
  });
  assert.equal(status, 1);
  assert.equal(stderr, "standard output is closed\n");
});
