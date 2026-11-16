import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { formatCsv, parseCsv } from "../../tracker-tables/src/csv.ts";
import { label } from "../../review-csv-exporter/src/headings.ts";
import { loadReviews } from "../src/reviews.ts";
import { setup, world, type RV, DAILY, NIGHTLY, WEEKLY } from "./support.ts";

const row: RV = { tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { current_version: ["1", "2", "update"] } };

/** Loads the review files of a folder after changing the cells of the first Use Cases row. */
async function load(cells: Record<string, string>, rvs: RV[] = [row]): Promise<{ problems: string[]; rows: Awaited<ReturnType<typeof loadReviews>> }> {
  const f = await setup(rvs);
  const w = await world();
  const path = `${f.reviews}/review-use-cases.csv`;
  const table = parseCsv(await readFile(path, "utf8"), path);
  Object.assign(table.rows[0]!, Object.fromEntries(Object.entries(cells).map(([key, value]) => [label(w.headings, key), value])));
  await writeFile(path, formatCsv(table.header, table.rows));
  const problems: string[] = [];
  const rows = await loadReviews(f.reviews, w.headings, problems);
  return { problems: problems.map((p) => p.replace(/^.*\/(review-)/, "$1")), rows };
}

test("[B10] a valid review file is read with its identity, fields and review cells", async () => {
  const { problems, rows } = await load({ review_status: "accepted", reviewed_on: "2026-11-19" });
  assert.deepEqual(problems, []);
  const [r] = rows.find((f) => f.tab === "Use Cases")!.rows;
  assert.deepEqual({ identity: r!.identity, status: r!.status, line: r!.line, digest: r!.digestMatches, field: r!.fields.find((x) => x.column === "current_version") }, { identity: "UC-001", status: "accepted", line: 2, digest: true, field: { column: "current_version", current: "1", proposed: "2", state: "update" } });
  assert.equal(rows.length, 3, "Mappings is never read");
});

test("[B10] a review row that breaks the exporter's rules stops the run with the file and line", async () => {
  const cases: [Record<string, string>, RegExp][] = [
    [{ review_status: "maybe" }, /review-use-cases\.csv: line 2: review_status "maybe" must be blank or one of accepted, rejected, clarify/],
    [{ reviewed_on: "yesterday" }, /line 2: reviewed_on "yesterday" is not a date/],
    [{ applied_on: "13/11" }, /line 2: applied_on "13\/11" is not a date/],
    [{ order: "first" }, /line 2: order "first" is not a whole number/],
    [{ record: "", record_key: "" }, /line 2: record and record_key are both blank/],
    [{ reason: "token: abcdef123456" }, /line 2: secret-looking value in "reason"; remove it from the file/],
  ];
  for (const [cells, message] of cases) assert.match((await load(cells)).problems.join("\n"), message);
});

test("[B10] a duplicate record, an unknown field state, a changed header, a missing file or a broken CSV stops the run", async () => {
  assert.match((await load({}, [row, row])).problems.join("\n"), /line 3: duplicate record "UC-001"/);
  const f = await setup([row]);
  const w = await world();
  const path = `${f.reviews}/review-use-cases.csv`;
  const text = await readFile(path, "utf8");
  const bad = async (content: string | undefined, message: RegExp) => {
    if (content === undefined) await rm(path);
    else await writeFile(path, content);
    const problems: string[] = [];
    await loadReviews(f.reviews, w.headings, problems);
    assert.match(problems.join("\n"), message);
  };
  await bad(text.replace("current_version (current)", "current_version (now)"), /line 1: the header is not the review header written by export-review/);
  await bad(text.replace(",2,update,", ",2,remove,"), /line 2: current_version \(state\) "remove" must be blank or one of add, update, suggest, held, conflict/);
  await bad(`${text}"open`, /review-use-cases\.csv: line 1: unterminated quoted field/);
  await bad(`${text.split("\n")[0]}\n${"x,".repeat(200)}x\n`, /line 2: row 2 has/);
  await bad(undefined, /review-use-cases\.csv: line 1: cannot read review file/);
});
