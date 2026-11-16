import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { useCaseId } from "../../tracker-tools/tracker-tables/src/use_case_id.ts";
import { parseCsv } from "../../tracker-tools/tracker-tables/src/csv.ts";
import {
  ACCEPT_ALL_PLAIN_ADDS, countsLine, decideAll, expected, headingsCsv, ID, masterCells, portable, REVISIT, rows, runCommand, sandbox, snapshot, step, WALK, walk, vendorCells,
  type Outcome,
} from "./support.ts";

const walked = walk();
walked.catch(() => {});
const ctx = async () => {
  const w = await walked;
  return { w, work: join(w.dir, "work") };
};
const exp = (name: string): Promise<string> => readFile(join(expected, name), "utf8");
const ok = (o: Outcome, id: string) => assert.equal(o.status, 0, `${id}: ${o.stderr}`);

/** A failure names the step, the file and the first differing line. */
async function same(id: string, file: string, actual: string): Promise<void> {
  const want = await exp(file);
  if (actual === want) return;
  const a = actual.split("\n");
  const b = want.split("\n");
  const i = a.findIndex((line, n) => line !== b[n]);
  assert.fail(`${id}: ${file} differs at line ${i + 1}: got "${a[i]}", expected "${b[i]}"`);
}

test("[B03] the reference proposal of S01 is a valid proposal for the derived use case ID", async () => {
  const { w, work } = await ctx();
  assert.equal(useCaseId("Harborline", "Refund Retry"), ID);
  const ref = join(w.dir, "reference-proposals", "tracker-updates", ID, "tracker-updates.csv");
  const checked = await runCommand(`node {pack}/tracker-tools/tracker-reconciler/src/main.ts validate ${ref}`, w.dir);
  assert.equal(checked.status, 0, checked.stderr);
  const keys = new Set((await rows(ref)).map((r) => r.record_key));
  assert.deepEqual([...keys].sort(), [ID, `${ID}/Q1`, `${ID}/Q2`, `${ID}/Q3`]);
  const [index] = await rows(join(expected, "use-case-index.csv"));
  assert.equal(useCaseId(index!.vendor!, index!.use_case_name!), ID, "S01: the index row derives the use case ID");
  assert.equal(index!.slug, "refund-retry");
  assert.equal(index!.folder, "harborline/refund-retry");
});

test("[B03] S03 gives the expected counts and review rows, and empty files for the other tabs", async () => {
  const { w, work } = await ctx();
  ok(w.out.S03!, "S03");
  await same("S03", "s03-counts.txt", countsLine(w.out.S03!, w.dir));
  const review = join(work, "review");
  const found = [];
  for (const file of ["review-use-cases.csv", "review-questions.csv", "review-identity-access.csv", "review-mappings.csv"]) {
    for (const r of await rows(join(review, file))) found.push({ file, order: r.order!, use_case: r.use_case!, record_key: r.record_key!, suggested_ref: r.suggested_ref!, kind: r.kind! });
  }
  const want = await rows(join(expected, "s03-review-rows.csv"));
  assert.deepEqual(found, want.map((r) => ({ file: r.file, order: r.order, use_case: r.use_case, record_key: r.record_key, suggested_ref: r.suggested_ref, kind: r.kind })), "S03: review-rows");
  assert.equal(found.filter((r) => r.file === "review-identity-access.csv" || r.file === "review-mappings.csv").length, 0);
});

test("[B03] the decisions (accept, reject, clarify, accept all plain adds, revisit) give the expected review cells", async () => {
  const { w, work } = await ctx();
  const dir = await sandbox();
  await cp(join(dir, "reference-proposals"), join(dir, "proposals"), { recursive: true });
  ok(await runCommand(step(w.all, "S03").command, dir), "S03");
  const review = join(dir, "work", "review");
  const read = async (): Promise<string> => {
    const out = [["file", "record_key", "review_status", "reviewer", "review_note", "reviewed_on"]];
    for (const file of ["review-use-cases.csv", "review-questions.csv"]) for (const r of await rows(join(review, file))) out.push([file, r.record_key!, r.review_status!, r.reviewer!, r.review_note!, r.reviewed_on!]);
    return out.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c)).join(",")).join("\n") + "\n";
  };
  await decideAll(review, WALK);
  await same("S04", "s04-decisions-walk.csv", await read());
  await decideAll(review, ACCEPT_ALL_PLAIN_ADDS);
  await same("S04", "s04-decisions-accept-all.csv", await read());
  await decideAll(review, REVISIT);
  await same("S04", "s04-decisions-final.csv", await read());
  assert.equal((await rows(join(review, "review-use-cases.csv"))).length, 1);
  assert.equal((await rows(join(review, "review-questions.csv"))).length, 3);
});

test("[B04] S05 builds the master from an empty export with the accepted rows only", async () => {
  const { w, work } = await ctx();
  ok(w.out.S05!, "S05");
  await same("S05", "s05-counts.txt", countsLine(w.out.S05!, w.dir));
  await same("S05", "s05-master.csv", await masterCells(join(work, "master-1.xlsx")));
  const report = await readFile(join(work, "master-1-report.md"), "utf8");
  assert.match(report, new RegExp(`Questions, ${ID}/Q2 .*not accepted \\(rejected\\)`));
  const applied = (await rows(join(work, "review", "review-questions.csv"))).map((r) => [r.record_key, r.applied_on]);
  assert.deepEqual(applied, [[`${ID}/Q1`, "2026-11-18"], [`${ID}/Q2`, ""], [`${ID}/Q3`, "2026-11-18"]]);
});

test("[B04] S06 releases by hand, S06b builds the first vendor workbook and S08 syncs, matching the references", async () => {
  const { w, work } = await ctx();
  await same("S06", "s06-master.csv", await masterCells(join(work, "master-2.xlsx")));
  for (const id of ["S06b", "S08"]) ok(w.out[id]!, id);
  await same("S06b", "s06b-counts.txt", countsLine(w.out.S06b!, w.dir));
  await same("S06b", "s06b-master.csv", await masterCells(join(work, "master-3.xlsx")));
  await same("S06b", "s06b-vendor-headings.csv", await headingsCsv(join(work, "vendor-1", "Harborline.xlsx")));
  await same("S06b", "s06b-vendor.csv", await vendorCells(join(work, "vendor-1", "Harborline.xlsx")));
  await same("S08", "s08-counts.txt", countsLine(w.out.S08!, w.dir));
  await same("S08", "s08-master.csv", await masterCells(join(work, "master-4.xlsx")));
  await same("S08", "s08-vendor.csv", await vendorCells(join(work, "vendor-2", "Harborline.xlsx")));
  await same("S09", "s09-master.csv", await masterCells(join(work, "master-5.xlsx")));
});

test("[B04] a rerun on the same inputs changes nothing: S03, S05 (from the new master), S06b, S08, S12 and S13", async () => {
  const { w, work } = await ctx();
  const before = await snapshot(w.dir);
  for (const id of ["S03", "S06b", "S08", "S12", "S13"]) ok(await runCommand(step(w.all, id).command, w.dir), `${id} rerun`);
  // S05 is run again from the new master, as its report says, writing under another name.
  const again = step(w.all, "S05").command
    .replace(/--from-export \{sandbox\}\/empty-export/, "--master {sandbox}/work/master-1.xlsx")
    .replace("--out {sandbox}/work/master-1.xlsx", "--out {sandbox}/work/rerun/master-1.xlsx")
    .replace("--report {sandbox}/work/master-1-report.md", "--report {sandbox}/work/rerun/report.md");
  ok(await runCommand(again, w.dir), "S05 rerun");
  const after = await snapshot(w.dir);
  const rerun = Object.keys(after).filter((k) => k.startsWith(join("work", "rerun")));
  assert.equal(after[join("work", "rerun", "master-1.xlsx")], before[join("work", "master-1.xlsx")], "S05 rerun: the master is identical");
  assert.match(after[join("work", "rerun", "report.md")]!, /Review rows: 4 = 0 applied/);
  for (const k of rerun) delete after[k];
  assert.deepEqual(after, before, "no file changed or appeared");
});

test("[B05] S08 copies only Q1's vendor-owned columns into the master and leaves status with the lead", async () => {
  const { w, work } = await ctx();
  const before = parseCsv(await masterCells(join(work, "master-3.xlsx")), "master-3").rows;
  const after = parseCsv(await masterCells(join(work, "master-4.xlsx")), "master-4").rows;
  const key = (r: Record<string, string>) => `${r.ref}|${r.field}`;
  const b = new Map(before.map((r) => [key(r), r.value]));
  const a = new Map(after.map((r) => [key(r), r.value]));
  const changed = [...new Set([...b.keys(), ...a.keys()])].filter((k) => b.get(k) !== a.get(k)).sort();
  assert.deepEqual(changed, ["QN-0001|answer", "QN-0001|answer_status", "QN-0001|answered_by", "QN-0001|answered_on", "QN-0001|last_updated"], "only Q1's answer cells and its last_updated changed");
  assert.equal(a.get("QN-0001|status"), "released", "status is still the lead's");
  assert.equal(a.get("QN-0003|answer"), undefined, "Q3 got nothing");
  const live = await masterCells(join(work, "master-4.xlsx"));
  assert.match(live, /Questions,QN-0001,answer,The job retries three times and waits 30 seconds between tries\./);
  const report = await readFile(join(work, "master-4-report.md"), "utf8");
  assert.match(report, /Vendor values synced: 4; sync conflicts: 0; held workbooks: 0/);
  const lead = parseCsv(await exp("s09-master.csv"), "s09-master.csv").rows.find((r) => key(r) === "QN-0001|status");
  assert.equal(lead!.value, "accepted", "the lead accepts by hand");
  const [answer] = await rows(join(w.dir, "vendor-answer", "answer.csv"));
  assert.equal(a.get("QN-0001|answer"), answer!.answer);
});

test("[B06] the version 2 proposal validates, adds no question row and gives the expected field updates", async () => {
  const { w, work } = await ctx();
  ok(w.out.S10b!, "S10b");
  await same("S10b", "s10b-ok.txt", portable(w.out.S10b!.stdout, w.dir));
  ok(w.out.S11b!, "S11b");
  await same("S11b", "s11b-counts.txt", countsLine(w.out.S11b!, w.dir));
  const out = join(work, "reconcile-v2");
  const files = Object.keys(await snapshot(out));
  assert.equal(files.some((f) => f.startsWith("additions")), false, "no additions at all, so no duplicate question row");
  const updates = await rows(join(out, "field-updates.csv"));
  assert.ok(updates.length > 0, "field updates are listed");
  const proposal = await rows(join(w.dir, "reference-proposals-v2", "tracker-updates", ID, "tracker-updates.csv"));
  assert.equal(proposal.filter((r) => r.tab === "Questions" && r.operation === "add").length, 0, "the proposal never adds a question");
  const version = proposal.find((r) => r.field === "current_version")!;
  assert.deepEqual([version.operation, version.value, version.base_value], ["set", "2", "1"], "specification version 2");
  assert.deepEqual(proposal.filter((r) => r.operation === "suggest").map((r) => `${r.field}=${r.value}`).sort(), ["incorporated_version=2", "status=incorporated"]);
});

test("[B07] S12 gives the expected summary for the fixed date, with the unanswered question overdue", async () => {
  const { w, work } = await ctx();
  ok(w.out.S12!, "S12");
  await same("S12", "s12-counts.txt", countsLine(w.out.S12!, w.dir));
  const summary = await readFile(join(work, "summary.md"), "utf8");
  await same("S12", "summary.md", summary);
  const overdue = summary.slice(summary.indexOf("## 2. Overdue questions"), summary.indexOf("## 3."));
  assert.match(overdue, /QN-0003 .*due 2026-11-23 .*8 days overdue/);
  assert.doesNotMatch(overdue, /QN-0001/);
});

test("[B10] S13: the Vendor Workbook Updater accepts the same review files and workbook and applies nothing", async () => {
  const { w, work } = await ctx();
  ok(w.out.S13!, "S13");
  await same("S13", "s13-counts.txt", countsLine(w.out.S13!, w.dir));
  const report = await readFile(join(work, "vendor-check-report.md"), "utf8");
  assert.match(report, /3 x already applied/);
  assert.match(report, new RegExp(`Questions, ${ID}/Q2 .*not accepted \\(rejected\\)`));
});
