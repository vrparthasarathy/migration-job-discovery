import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isReference, loadSchema } from "../../tracker-tables/src/schema.ts";
import { isIsoDate, readHolidays } from "../../tracker-tables/src/working_days.ts";
import { InputError, loadExport } from "../../tracker-reconciler/src/inputs.ts";
import { loadHeadings } from "../../review-csv-exporter/src/headings.ts";
import { reviewFile } from "../../review-csv-exporter/src/review.ts";
import { decide } from "./apply.ts";
import { loadColumns, VENDOR_TABS } from "./columns.ts";
import { checkPaths, writeAll } from "./files.ts";
import { renderReport } from "./report.ts";
import { loadReviews, markApplied } from "./reviews.ts";
import { readVendorWorkbook } from "./workbook_read.ts";
import { buildVendorWorkbook } from "./workbook_write.ts";

export type Io = { out: (text: string) => void; err: (text: string) => void; today: () => string };

const SCHEMA_PATH = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
const HEADINGS_PATH = fileURLToPath(new URL("../../review-csv-exporter/data/review-headings.csv", import.meta.url));
const COLUMNS_PATH = fileURLToPath(new URL("../../sample-tracker-workbook/data/headings.csv", import.meta.url));
const EDITED_PATH = fileURLToPath(new URL("../data/vendor-edited.csv", import.meta.url));
const USAGE =
  "usage: update-vendor-workbook --workbook <downloaded.xlsx> --reviews <dir> --export <dir> --vendor <vendor> --out <updated.xlsx> --report <report.md> [--release-batch <ref> --release-date <YYYY-MM-DD>] [--run-date <YYYY-MM-DD>] [--holidays <file>] [--headings <file>] [--columns <file>]";
const OPTIONS = ["workbook", "reviews", "export", "vendor", "out", "report", "release-batch", "release-date", "run-date", "holidays", "headings", "columns"];
const REQUIRED = ["workbook", "reviews", "export", "vendor", "out", "report"];

class UsageError extends InputError {}

function parse(args: string[], today: string): Record<string, string> {
  const [command, ...rest] = args;
  if (command !== "update-vendor-workbook") throw new UsageError(command === undefined ? [USAGE] : [`unknown command "${command}"`, USAGE]);
  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (!arg.startsWith("--") || !OPTIONS.includes(arg.slice(2))) throw new UsageError([`unknown argument "${arg}"`, USAGE]);
    if (rest[i + 1] === undefined) throw new UsageError([`${arg} needs a value`, USAGE]);
    options[arg.slice(2)] = rest[++i]!;
  }
  for (const name of REQUIRED) if (options[name] === undefined) throw new UsageError([`update-vendor-workbook needs --${name}`, USAGE]);
  if ((options["release-batch"] === undefined) !== (options["release-date"] === undefined)) throw new UsageError(["--release-batch and --release-date come together", USAGE]);
  if (options["release-batch"] !== undefined && !isReference(options["release-batch"])) throw new UsageError([`--release-batch "${options["release-batch"]}" is not a reference such as BT-001`, USAGE]);
  options["run-date"] ??= today;
  for (const name of ["release-date", "run-date"]) {
    if (options[name] !== undefined && !isIsoDate(options[name]!)) throw new UsageError([`--${name} "${options[name]}" is not a date in YYYY-MM-DD format`, USAGE]);
  }
  return options;
}

async function update(options: Record<string, string>, io: Io): Promise<void> {
  const { workbook: workbookPath, reviews: reviewsDir, export: exportDir, vendor, out, report } = options as Record<string, string>;
  const runDate = options["run-date"]!;
  const release = options["release-batch"] === undefined ? undefined : { batch: options["release-batch"], date: options["release-date"]! };
  const schema = await loadSchema(SCHEMA_PATH);

  const problems: string[] = [];
  const headings = await loadHeadings(options.headings ?? HEADINGS_PATH, schema, problems);
  const columns = await loadColumns(options.columns ?? COLUMNS_PATH, EDITED_PATH, schema, problems);
  const data = await loadExport(exportDir, schema, problems);
  let holidays: string[] = [];
  if (options.holidays !== undefined) holidays = await readHolidays(options.holidays).catch((error: Error) => (problems.push(error.message), []));
  if (data) {
    const { manifest } = data;
    if (!data.tables["Use Cases"]!.rows.some((row) => row.vendor === vendor)) problems.push(`${manifest.file}: line 1: vendor "${vendor}" has no use case in the export`);
    const batch = data.tables.Batches!.rows.find((row) => row.batch_ref === release?.batch);
    if (batch && batch.vendor !== vendor) problems.push(`${data.tables.Batches!.file}: batch ${release!.batch} belongs to "${batch.vendor}", not "${vendor}"`);
    if (batch && batch.released_on !== "" && batch.released_on !== release!.date) problems.push(`${data.tables.Batches!.file}: batch ${release!.batch} was released on ${batch.released_on}, not ${release!.date}`);
  }
  const reviews = headings ? await loadReviews(reviewsDir, headings, problems) : [];
  const workbook = columns ? await readVendorWorkbook(workbookPath, columns, vendor, problems) : undefined;
  const inputs = [workbookPath, ...VENDOR_TABS.map((tab) => join(reviewsDir, reviewFile(tab))), ...["holidays", "headings", "columns"].flatMap((name) => options[name] ?? [])];
  await checkPaths(out, report, inputs, exportDir, problems);
  if (problems.length > 0 || !headings || !columns || !data || !workbook) throw new InputError(problems);

  const decision = decide({ schema, columns, vendor, release, holidays, workbook, data, reviews }, problems);
  if (problems.length > 0) throw new InputError(problems);

  const marked = markApplied(reviews, new Set(decision.applied.map((a) => a.review)), headings, runDate);
  await writeAll([
    { path: out, content: await buildVendorWorkbook(schema, columns, decision.rows, vendor, runDate) },
    { path: report, content: renderReport({ workbook: workbookPath, vendor, runDate, release }, decision) },
    ...marked.map((m) => ({ path: m.file, content: m.text })),
  ]);
  io.out(`applied ${decision.applied.length} row(s), skipped ${decision.skipped.length}, ${decision.conflicts.length} conflict(s), ${decision.pending.length} pending question(s)\nwrote ${out} and ${report}\n`);
}

/** Runs the command and returns the exit status: 0 done, 1 an input problem, 2 bad usage. */
export async function run(argv: string[], io: Io): Promise<number> {
  try {
    await update(parse(argv, io.today()), io);
    return 0;
  } catch (error) {
    io.err(((error as InputError).messages ?? [(error as Error).message]).join("\n") + "\n");
    return error instanceof UsageError ? 2 : 1;
  }
}
