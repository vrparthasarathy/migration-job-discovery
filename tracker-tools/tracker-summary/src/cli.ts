import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getTab, loadSchema } from "../../tracker-tables/src/schema.ts";
import { isIsoDate, readHolidays } from "../../tracker-tables/src/working_days.ts";
import { InputError, loadExport } from "./inputs.ts";
import { renderSummary } from "./render.ts";
import { buildSummary } from "./summary.ts";

export type Io = { out: (text: string) => void; err: (text: string) => void };

const SCHEMA_PATH = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
const USAGE = "usage: summary --export <dir> [--date <YYYY-MM-DD>] [--holidays <file>] --out <file>";
const KNOWN = ["--export", "--date", "--holidays", "--out"];

function parse(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) throw new InputError([`unexpected argument "${arg}"`, USAGE]);
    if (!KNOWN.includes(arg)) throw new InputError([`unknown option "${arg}"`, USAGE]);
    if (args[i + 1] === undefined) throw new InputError([`${arg} needs a value`, USAGE]);
    options[arg.slice(2)] = args[++i]!;
  }
  for (const name of ["export", "out"]) {
    if (options[name] === undefined) throw new InputError([`summary needs --${name}`, USAGE]);
  }
  return options;
}

/** Runs the summary command; returns the exit status (0, or 1 on a usage or input error, with nothing written). */
export async function run(argv: string[], io: Io, today: () => string = () => new Date().toISOString().slice(0, 10)): Promise<number> {
  try {
    const options = parse(argv);
    const exportDir = options.export!;
    const out = options.out!;
    const date = options.date ?? today();
    if (!isIsoDate(date)) throw new InputError([`--date "${date}" is not YYYY-MM-DD`]);
    if (resolve(out).startsWith(resolve(exportDir) + sep)) throw new InputError(["--out must not be inside the export folder; the export is never changed"]);
    const holidays = options.holidays === undefined ? [] : await readHolidays(options.holidays);
    const schema = await loadSchema(SCHEMA_PATH);
    const tables = await loadExport(exportDir, schema);
    const stages = getTab(schema, "Use Cases").columns.find((c) => c.column === "stage")!.allowed;
    const text = renderSummary(buildSummary(tables, stages, date, holidays));
    await mkdir(dirname(resolve(out)), { recursive: true });
    await writeFile(out, text, "utf8");
    io.out(`summarized ${tables["Use Cases"]!.rows.length} use case(s) as of ${date}\nwrote ${out}\n`);
    return 0;
  } catch (error) {
    io.err(((error as InputError).messages ?? [(error as Error).message]).join("\n") + "\n");
    return 1;
  }
}
