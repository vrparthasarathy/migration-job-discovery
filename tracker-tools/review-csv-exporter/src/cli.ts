import { fileURLToPath } from "node:url";
import { loadSchema } from "../../tracker-tables/src/schema.ts";
import { InputError, loadExport, loadProposals } from "../../tracker-reconciler/src/inputs.ts";
import { reconcile } from "../../tracker-reconciler/src/reconcile.ts";
import { checkOut, renderFiles, writeFiles } from "./files.ts";
import { loadHeadings } from "./headings.ts";
import { loadReviews, mergeReviews } from "./review.ts";
import { buildRows, TABS } from "./rows.ts";

export type Io = { out: (text: string) => void; err: (text: string) => void };

const SCHEMA_PATH = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
const HEADINGS_PATH = fileURLToPath(new URL("../data/review-headings.csv", import.meta.url));
const USAGE = "usage: export-review --export <dir> --proposals <dir> [--scope <slug>] [--headings <file>] --out <dir>";
const OPTIONS = ["--export", "--proposals", "--scope", "--headings", "--out"];

class UsageError extends InputError {}

function parse(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!OPTIONS.includes(arg)) throw new UsageError([`unknown argument "${arg}"`, USAGE]);
    if (args[i + 1] === undefined) throw new UsageError([`${arg} needs a value`, USAGE]);
    options[arg.slice(2)] = args[++i]!;
  }
  for (const name of ["export", "proposals", "out"]) {
    if (options[name] === undefined) throw new UsageError([`export-review needs --${name}`, USAGE]);
  }
  return options;
}

async function exportReview(args: string[], io: Io): Promise<void> {
  const options = parse(args);
  const { export: exportDir, proposals, out } = options as Record<string, string>;
  const scope = options.scope ?? "internal";
  const schema = await loadSchema(SCHEMA_PATH);

  const problems: string[] = [];
  const headings = await loadHeadings(options.headings ?? HEADINGS_PATH, schema, problems);
  const data = await loadExport(exportDir, schema, problems);
  const { files, changes } = await loadProposals(proposals, schema, data, problems);
  if (data && !data.manifest.rows.some((r) => r.scope === scope)) problems.push(`${data.manifest.file}: no row for scope "${scope}"`);
  await checkOut(out, [exportDir, proposals], problems);
  const stored = headings ? await loadReviews(out, headings, problems) : undefined;
  if (problems.length > 0 || !data || !headings || !stored) throw new InputError(problems);

  const result = reconcile(schema, data, changes, scope);
  const built = buildRows(schema, headings, data, result, changes);
  await writeFiles(out, renderFiles(headings, mergeReviews(built, stored, headings)));

  const rejected = result.rejected.map((r) => `rejected: ${r.change.file}: line ${r.change.line}: ${r.reason}\n`).join("");
  const perTab = TABS.map((tab) => `${tab} ${built.filter((b) => b.tab === tab).length}`).join(", ");
  const perTier = [1, 2, 3].map((tier) => `tier ${tier} ${built.filter((b) => b.tier === tier).length}`).join(", ");
  io.out(`${rejected}exported ${built.length} review row(s) from ${files.length} proposal file(s): ${perTab}; ${perTier}\nwrote ${out}\n`);
}

export async function run(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command !== "export-review") throw new UsageError(command === undefined ? [USAGE] : [`unknown command "${command}"`, USAGE]);
    await exportReview(rest, io);
    return 0;
  } catch (error) {
    io.err(((error as InputError).messages ?? [(error as Error).message]).join("\n") + "\n");
    return error instanceof UsageError ? 2 : 1;
  }
}
