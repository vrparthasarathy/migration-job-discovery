import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSchema } from "../../tracker-tables/src/schema.ts";
import { isIsoDate, readHolidays } from "../../tracker-tables/src/working_days.ts";
import { InputError } from "../../tracker-reconciler/src/inputs.ts";
import { loadHeadings, type Headings } from "../../review-csv-exporter/src/headings.ts";
import { reviewFile } from "../../review-csv-exporter/src/review.ts";
import { loadColumns, type Columns } from "../../vendor-workbook-updater/src/columns.ts";
import { writeAll } from "../../vendor-workbook-updater/src/files.ts";
import { readVendorWorkbook, type WorkbookData } from "../../vendor-workbook-updater/src/workbook_read.ts";
import { decide, emptyDecision } from "./apply.ts";
import { loadMasterColumns, MASTER_TABS } from "./master_columns.ts";
import { readExportBase, readMaster, type Master } from "./master_read.ts";
import { buildMaster, fillDueDates } from "./master_write.ts";
import { checkPaths, type Output } from "./paths.ts";
import { renderReport } from "./report.ts";
import { loadReviews, markApplied, type ReviewFile } from "./reviews.ts";
import { syncVendor } from "./sync.ts";
import { buildVendor, type VendorOutcome } from "./vendor_build.ts";

export type Io = { out: (text: string) => void; err: (text: string) => void; today: () => string };

const SCHEMA_PATH = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
const HEADINGS_PATH = fileURLToPath(new URL("../../review-csv-exporter/data/review-headings.csv", import.meta.url));
const COLUMNS_PATH = fileURLToPath(new URL("../../sample-tracker-workbook/data/headings.csv", import.meta.url));
const EDITED_PATH = fileURLToPath(new URL("../../vendor-workbook-updater/data/vendor-edited.csv", import.meta.url));
const REVIEW_TABS = ["Use Cases", "Questions", "Identity & Access", "Mappings"];
const USAGE =
  "usage: update-master-workbook ( --master <downloaded-master.xlsx> | --from-export <dir> ) --out <new-master.xlsx> --report <report.md> [--reviews <dir> [--headings <file>]] [--vendor <vendor>=<downloaded-vendor.xlsx>]... [--new-vendor <vendor>]... [--vendor-out <dir>] [--run-date <YYYY-MM-DD>] [--holidays <file>] [--columns <file>]";
const SINGLE = ["master", "from-export", "out", "report", "reviews", "headings", "vendor-out", "run-date", "holidays", "columns"];
const REPEATED = ["vendor", "new-vendor"];

class UsageError extends InputError {}
type Options = { single: Record<string, string>; vendors: { name: string; path: string }[]; newVendors: string[] };

function parse(args: string[], today: string): Options {
  const [command, ...rest] = args;
  if (command !== "update-master-workbook") throw new UsageError(command === undefined ? [USAGE] : [`unknown command "${command}"`, USAGE]);
  const single: Record<string, string> = {};
  const repeated: Record<string, string[]> = { vendor: [], "new-vendor": [] };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    const name = arg.slice(2);
    if (!arg.startsWith("--") || ![...SINGLE, ...REPEATED].includes(name)) throw new UsageError([`unknown argument "${arg}"`, USAGE]);
    if (rest[i + 1] === undefined) throw new UsageError([`${arg} needs a value`, USAGE]);
    const value = rest[++i]!;
    if (REPEATED.includes(name)) repeated[name]!.push(value);
    else if (name in single) throw new UsageError([`${arg} is given twice`, USAGE]);
    else single[name] = value;
  }
  if ((single.master === undefined) === (single["from-export"] === undefined)) throw new UsageError(["give exactly one of --master and --from-export", USAGE]);
  for (const name of ["out", "report"]) if (single[name] === undefined) throw new UsageError([`update-master-workbook needs --${name}`, USAGE]);
  if (single.headings !== undefined && single.reviews === undefined) throw new UsageError(["--headings needs --reviews", USAGE]);
  const vendors = repeated.vendor!.map((value) => {
    const at = value.indexOf("=");
    if (at <= 0 || at === value.length - 1) throw new UsageError(["--vendor needs <vendor>=<path>, as in Acme=acme.xlsx", USAGE]);
    return { name: value.slice(0, at), path: value.slice(at + 1) };
  });
  if (vendors.length + repeated["new-vendor"]!.length > 0 && single["vendor-out"] === undefined) throw new UsageError(["a named vendor needs --vendor-out", USAGE]);
  single["run-date"] ??= today;
  if (!isIsoDate(single["run-date"])) throw new UsageError([`--run-date "${single["run-date"]}" is not a date in YYYY-MM-DD format`, USAGE]);
  return { single, vendors, newVendors: repeated["new-vendor"]! };
}

async function update(options: Options, io: Io): Promise<void> {
  const o = options.single;
  const runDate = o["run-date"]!;
  const schema = await loadSchema(SCHEMA_PATH);
  const problems: string[] = [];
  const columnsFile = o.columns ?? COLUMNS_PATH;
  const masterColumns = await loadMasterColumns(columnsFile, schema, problems);
  const vendorColumns = await loadColumns(columnsFile, EDITED_PATH, schema, problems);
  const master = o.master === undefined ? await readExportBase(o["from-export"]!, schema, problems) : masterColumns && (await readMaster(o.master, masterColumns, schema, problems));
  if (master && master.holidays.length === 0 && o.holidays !== undefined) master.holidays = await readHolidays(o.holidays).catch((error: Error) => (problems.push(error.message), []));

  let headings: Headings | undefined;
  let reviews: ReviewFile[] = [];
  if (o.reviews !== undefined) {
    headings = await loadHeadings(o.headings ?? HEADINGS_PATH, schema, problems);
    reviews = headings ? await loadReviews(o.reviews, headings, REVIEW_TABS, problems) : [];
  }
  const downloads = new Map<string, WorkbookData>();
  for (const { name, path } of options.vendors) {
    const data = vendorColumns ? await readVendorWorkbook(path, vendorColumns, name, problems) : undefined;
    if (data) downloads.set(name, data);
  }
  const names = [...options.vendors.map((v) => v.name), ...options.newVendors];
  names.forEach((name, i) => {
    if (names.indexOf(name) !== i) problems.push(`vendor "${name}" is named twice`);
    if (/[\\/]/.test(name) || name === "." || name === "..") problems.push(`vendor "${name}" cannot be used as a file name`);
  });

  const outputs: Output[] = [{ flag: "--out", path: o.out! }, { flag: "--report", path: o.report! }, ...names.map((name) => ({ flag: `the workbook of ${name}`, path: join(o["vendor-out"]!, `${name}.xlsx`) }))];
  const inputs = [...[o.master, o.holidays, o.headings, o.columns].flatMap((p) => p ?? []), ...options.vendors.map((v) => v.path), ...(o.reviews !== undefined ? REVIEW_TABS.map((tab) => join(o.reviews!, reviewFile(tab))) : [])];
  await checkPaths(outputs, inputs, o["from-export"] !== undefined ? [o["from-export"]] : [], problems);
  if (problems.length > 0 || !master || !masterColumns || !vendorColumns) throw new InputError(problems);

  const decision = headings ? decide(schema, master, reviews, headings, runDate, problems) : emptyDecision();
  const known = new Set(master.tables["Use Cases"]!.rows.map((row) => row.vendor!.trim()));
  for (const name of names) if (!known.has(name)) problems.push(`${master.file}: line 1: vendor "${name}" has no use case in the master`);
  if (problems.length > 0) throw new InputError(problems);

  const syncs = options.vendors.map((v) => syncVendor(schema, vendorColumns, master, v.name, downloads.get(v.name)!, runDate));
  const mismatches = fillDueDates(master);
  const outcomes: VendorOutcome[] = [];
  for (const name of names) outcomes.push(await buildVendor(schema, vendorColumns, master, name, downloads.get(name), runDate));

  const marked = headings ? markApplied(reviews, new Set(decision.applied.map((a) => a.review)), headings, runDate) : [];
  const files = [
    { path: o.out!, content: await buildMaster(schema, masterColumns, master, runDate) },
    ...outcomes.flatMap((x) => (x.bytes ? [{ path: join(o["vendor-out"]!, `${x.vendor}.xlsx`), content: x.bytes }] : [])),
  ];
  const report = renderReport(
    {
      base: basename(o.master ?? o["from-export"]!),
      runDate,
      reviewRows: reviews.reduce((n, f) => n + f.rows.length, 0),
      vendors: [...options.vendors.map((v) => ({ name: v.name, mode: "sync" as const })), ...options.newVendors.map((name) => ({ name, mode: "new" as const }))],
      syncs,
      outcomes,
      mismatches,
      dropped: master.dropped,
      extras: Object.fromEntries(MASTER_TABS.map((tab) => [tab, master.tables[tab]!.extras])),
      files: [...files.map((f) => basename(f.path)), basename(o.report!), ...marked.map((m) => basename(m.file))],
    },
    decision,
  );
  await writeAll([...files, { path: o.report!, content: report }, ...marked.map((m) => ({ path: m.file, content: m.text }))]);
  io.out(`applied ${decision.applied.length} row(s), skipped ${decision.skipped.length}, ${decision.conflicts.length} conflict(s); synced ${syncs.reduce((n, s) => n + s.synced.length, 0)} vendor value(s), ${outcomes.filter((x) => !x.bytes).length} vendor workbook(s) held\nwrote ${o.out} and ${o.report}\n`);
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
