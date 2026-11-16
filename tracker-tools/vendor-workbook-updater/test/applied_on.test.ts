import assert from "node:assert/strict";
import { readFile, stat, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { listFiles, ok, rowsOf, RUN_DATE, setup, update, type RV } from "./support.ts";

const version: RV = { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", fields: { current_version: ["1", "2", "update"] } };
const service: RV = { tab: "Identity & Access", record: "AX-001", useCase: "Daily Report", fields: { service: ["Reports", "Reports v2", "update"] } };
const stale: RV = { tab: "Questions", record: "QN-0001", useCase: "Daily Report", fields: { question_text: ["Other", "New", "update"] } };

test("[B9] applied_on is set to the run date on applied rows only, and only that cell changes", async () => {
  const f = await setup([version, { ...service, status: "rejected" }, stale]);
  const before = await rowsOf(`${f.reviews}/review-use-cases.csv`);
  const questions = await readFile(`${f.reviews}/review-questions.csv`, "utf8");
  const access = await readFile(`${f.reviews}/review-identity-access.csv`, "utf8");
  await ok(f);
  assert.deepEqual(await rowsOf(`${f.reviews}/review-use-cases.csv`), before.map((r) => ({ ...r, applied_on: RUN_DATE })));
  assert.equal(await readFile(`${f.reviews}/review-identity-access.csv`, "utf8"), access, "a rejected row is not marked");
  assert.equal(await readFile(`${f.reviews}/review-questions.csv`, "utf8"), questions, "a file without an applied row is not rewritten");
});

test("[B9] a file with no applied row keeps its own formatting", async () => {
  const f = await setup([service]);
  const path = `${f.reviews}/review-use-cases.csv`;
  const crlf = (await readFile(path, "utf8")).replaceAll("\n", "\r\n");
  await writeFile(path, crlf);
  await ok(f);
  assert.equal(await readFile(path, "utf8"), crlf);
});

test("[B9] when the run fails nothing is written, not even applied_on of rows that were fine", async () => {
  const f = await setup([version, { tab: "Identity & Access", key: "x", ref: "AX-001", useCase: "Daily Report", fields: { service: ["", "S", "add"] } }]);
  const before = await listFiles(f.root);
  const content = await readFile(`${f.reviews}/review-use-cases.csv`, "utf8");
  assert.equal((await update(f)).status, 1);
  assert.deepEqual(await listFiles(f.root), before);
  assert.equal(await readFile(`${f.reviews}/review-use-cases.csv`, "utf8"), content);
});

test("[B9] the workbook, report and review files are written together and no temporary file is left", async () => {
  const f = await setup([version]);
  await ok(f);
  const names = await listFiles(f.root);
  assert.ok(names.includes("out/updated.xlsx") && names.includes("out/report.md"));
  assert.equal(names.some((n) => n.endsWith(".tmp")), false);
  assert.ok((await stat(f.out)).size > 0);
});

test("[B9] the output paths must differ from each other, from the inputs and from the export, and not be folders", async () => {
  const f = await setup([version]);
  const bad = async (...more: string[]) => {
    const outcome = await update({ ...f, out: f.out, report: f.report }, ...more);
    assert.equal(outcome.status, 1, outcome.stderr);
    return outcome.stderr;
  };
  assert.match(await bad("--out", f.report), /--out and --report must be different files/);
  assert.match(await bad("--out", f.workbook), /--out .* is also an input file/);
  assert.match(await bad("--report", `${f.reviews}/review-questions.csv`), /--report .* is also an input file/);
  assert.match(await bad("--out", `${f.exportDir}/new.xlsx`), /--out .* is inside the export folder/);
  assert.match(await bad("--report", f.root), /--report .* is a folder/);
});
