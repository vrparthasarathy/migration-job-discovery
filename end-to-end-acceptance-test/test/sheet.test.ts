import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { expected, fixtures, FIELD_ORDER, parseSteps, sheetText, type Step } from "./support.ts";

const sheet = await sheetText();
const all = parseSteps(sheet);
const WITH_FALLBACK = ["S01", "S10", "S11"];
const IDS = ["S01", "S02", "S03", "S04", "S05", "S06", "S06b", "S07", "S08", "S09", "S10", "S10b", "S11", "S11b", "S12", "S13"];

const complete = () => assert.equal(all.length, IDS.length, "the sheet has all its steps");
const at = (heading: string): number => sheet.indexOf(`\n## ${heading}`);
const section = (heading: string): string => {
  const start = at(heading);
  assert.ok(start >= 0, `the sheet has no "## ${heading}" section`);
  const next = sheet.indexOf("\n## ", start + 1);
  return sheet.slice(start, next < 0 ? undefined : next);
};

test("[B01] the prerequisites and the record sheet come first, before step S01", () => {
  const prerequisites = at("Prerequisites");
  const record = at("Record sheet");
  const first = sheet.indexOf("### S01");
  assert.ok(prerequisites >= 0 && record > prerequisites, "Prerequisites, then Record sheet");
  assert.ok(first > record, "step S01 comes after both");
  assert.deepEqual(all.map((s) => s.id), IDS, "steps in order, none missing");
});

test("[B01] the prerequisites name Node 26, npm ci in both updaters, the skills, the sandbox, the people and the dates", () => {
  const text = section("Prerequisites");
  assert.match(text, /Node 26/);
  assert.match(text, /npm ci.*master-workbook-updater.*vendor-workbook-updater/s);
  for (const skill of ["run-discovery", "propose-tracker-updates", "discover-identity-access", "document-job-behavior", "recommend-workflows", "record-review-decisions"]) assert.ok(text.includes(skill), `skill ${skill}`);
  assert.match(text, /cp -R \{pack\}\/end-to-end-acceptance-test\/fixtures \{sandbox\}/);
  assert.match(text, /throwaway/);
  for (const name of ["Lena Park", "Harborline Contact", "Dev Okafor"]) assert.ok(text.includes(name), name);
  assert.match(text, /dates shown/);
});

test("[B01] the record sheet has the fixed columns and one row per step", () => {
  const text = section("Record sheet");
  const header = text.split("\n").find((l) => l.startsWith("| Step ID"))!;
  assert.deepEqual(
    header.split("|").slice(1, -1).map((c) => c.trim()),
    ["Step ID", "Who", "Result (pass, fail or fallback used)", "Date", "Initials", "Notes", "Evidence file"],
  );
  const ids = text.split("\n").filter((l) => /^\| S\d\d/.test(l)).map((l) => l.split("|")[1]!.trim());
  assert.deepEqual(ids, IDS);
});

test("[B02] every step has the seven fields in order, a fenced prompt or command and a pass or fail box", () => {
  complete();
  for (const s of all) {
    const labels = [...s.text.matchAll(/^- \*\*([^*]+):\*\*/gm)].map((m) => m[1]);
    assert.deepEqual(labels, FIELD_ORDER, `${s.id}: fields`);
    for (const field of FIELD_ORDER) assert.ok((s.fields[field] ?? "").length > 0, `${s.id}: ${field} is empty`);
    assert.ok(s.command.trim().length > 0, `${s.id}: no fenced prompt or command`);
    assert.match(s.fields["Pass or fail"]!, /\[ \] pass\s+\[ \] fail\s+\[ \] fallback used/, `${s.id}: pass or fail box`);
    assert.match(s.fields["Who"]!, /Developer|Lead|Vendor stand-in/, `${s.id}: who`);
  }
});

test("[B02] a command uses only the {pack} and {sandbox} placeholders and runs a tool by its main.ts", () => {
  complete();
  for (const s of all.filter((x) => x.command.startsWith("node "))) {
    const used = new Set(s.command.match(/\{[^}]*\}/g));
    for (const p of used) assert.ok(p === "{pack}" || p === "{sandbox}", `${s.id}: unknown placeholder ${p}`);
    assert.match(s.command, /^node \{pack\}\/tracker-tools\/[a-z-]+\/src\/main\.ts /, s.id);
  }
});

test("[B02] every step's expected result is concrete: it names a reference file that exists", async () => {
  complete();
  const mentioned = (s: Step) => [...s.fields["Expected result"]!.matchAll(/`((?:expected|reference-proposals(?:-v2)?|vendor-answer)\/[^`]+)`/g)].map((m) => m[1]!);
  for (const s of all) {
    const paths = mentioned(s);
    assert.ok(paths.length > 0, `${s.id}: names no reference output`);
    for (const p of paths) await access(join(fixtures, p)).catch(() => assert.fail(`${s.id}: ${p} does not exist in fixtures/`));
  }
  assert.ok(expected.endsWith("expected"));
});

test("[B02] the known gap of S11 names the backlog item and the reference export", () => {
  const s11 = all.find((s) => s.id === "S11")!;
  assert.match(s11.text, /No tool exports the master back to CSV/);
  assert.match(s11.text, /master-csv-export/);
  assert.match(s11.text, /expected\/export-after-answer/);
});

test("[B08] the failure handling section says to stop, record the error line, edit no file and mark a fallback", () => {
  const text = section("Failure handling");
  assert.match(text, /\*\*Stop\*\* at the first failed step/);
  assert.match(text, /exact error line/);
  assert.match(text, /\*\*Edit no file\*\* to get past a tool's error/);
  assert.match(text, /only where the step's \*\*If it fails\*\* says so/);
  assert.match(text, /\*\*fallback used\*\*/);
  assert.match(text, /Steps that do not depend on it may still be run/);
});

test("[B08] every step says to stop on a failure, and only S01, S10 and S11 give a fallback command", () => {
  complete();
  for (const s of all) {
    const fails = s.fields["If it fails"]!;
    assert.match(fails, /^Stop/, `${s.id}: starts with the stop`);
    if (WITH_FALLBACK.includes(s.id)) {
      assert.match(fails, /\*\*fallback used\*\*/, `${s.id}: marks the fallback`);
      assert.match(s.fallback, /^cp -R \{sandbox\}\/(reference-proposals(-v2)?|expected\/export-after-answer) \{sandbox\}\/(proposals|work\/proposals-v2|work\/export-after-answer)$/, `${s.id}: fallback command`);
    } else {
      assert.equal(s.fallback, "", `${s.id}: no fallback command`);
      assert.match(fails, /[Nn]o fallback|There is no fallback/, `${s.id}: says there is no fallback`);
    }
  }
});

test("[B08] no step tells the person to edit a file to get past an error", () => {
  complete();
  for (const s of all) {
    const fails = s.fields["If it fails"]!;
    assert.doesNotMatch(fails, /\b(then|and) edit\b/i, `${s.id}: never says to edit to get past an error`);
    assert.match(fails, /[Dd]o not|No fallback|no fallback/, `${s.id}: forbids a workaround or says there is no fallback`);
  }
});
