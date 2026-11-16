import { join } from "node:path";
import { isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { loadSampleData, SampleDataError } from "./sample_data.ts";
import { buildWorkbook, saveWorkbook } from "./workbook.ts";

const USAGE = "usage: node src/main.ts generate --out <file.xlsx> --as-of <YYYY-MM-DD> [--data <folder>]";
const COMPONENT = join(import.meta.dirname, "..");

function parse(args: string[]): { out: string; asOf: string; data: string } | undefined {
  const [command, ...rest] = args;
  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i]!;
    if (!["--out", "--as-of", "--data"].includes(flag) || rest[i + 1] === undefined) return undefined;
    options[flag] = rest[i + 1]!;
  }
  const { "--out": out, "--as-of": asOf, "--data": data = join(COMPONENT, "data") } = options;
  if (command !== "generate" || !out || !asOf || !isIsoDate(asOf)) return undefined;
  return { out, asOf, data };
}

const options = parse(process.argv.slice(2));
if (!options) {
  console.error(USAGE);
  process.exitCode = 2;
} else {
  try {
    const schema = join(COMPONENT, "..", "..", "tracker-data-contract", "tracker-schema.csv");
    const workbook = buildWorkbook(await loadSampleData(options.data, schema), options.asOf);
    await saveWorkbook(workbook, options.out);
  } catch (error) {
    if (error instanceof SampleDataError) console.error(`${error.findings.length} problem(s) found; nothing was written:\n${error.message}`);
    else console.error(`error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
