import { fileURLToPath } from "node:url";
import { loadSchema } from "../../tracker-tables/src/schema.ts";
import { InputError, loadExport, loadProposals, validatePath } from "./inputs.ts";
import { reconcile } from "./reconcile.ts";
import { buildFiles, checkOutput, writeOutputs } from "./report.ts";

export type Io = { out: (text: string) => void; err: (text: string) => void };

const SCHEMA_PATH = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
const USAGE = "usage: reconcile --export <dir> --proposals <dir> [--scope <slug>] --out <dir>\n       validate <file-or-dir>";

function parse(args: string[], known: string[]): { options: Record<string, string>; positional: string[] } {
  const options: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) positional.push(arg);
    else if (!known.includes(arg)) throw new InputError([`unknown option "${arg}"`, USAGE]);
    else if (args[i + 1] === undefined) throw new InputError([`${arg} needs a value`, USAGE]);
    else options[arg.slice(2)] = args[++i]!;
  }
  return { options, positional };
}

async function reconcileCommand(args: string[], io: Io): Promise<void> {
  const { options, positional } = parse(args, ["--export", "--proposals", "--scope", "--out"]);
  if (positional.length > 0) throw new InputError([`unexpected argument "${positional[0]}"`, USAGE]);
  for (const name of ["export", "proposals", "out"]) {
    if (options[name] === undefined) throw new InputError([`reconcile needs --${name}`, USAGE]);
  }
  const { export: exportDir, proposals, out } = options as Record<string, string>;
  const scope = options.scope ?? "internal";
  const schema = await loadSchema(SCHEMA_PATH);

  const problems: string[] = [];
  const data = await loadExport(exportDir!, schema, problems);
  const { files, changes } = await loadProposals(proposals!, schema, data, problems);
  if (data && !data.manifest.rows.some((r) => r.scope === scope)) problems.push(`${data.manifest.file}: no row for scope "${scope}"`);
  if (problems.length > 0 || !data) throw new InputError(problems);

  await checkOutput(out!, [exportDir!, proposals!]);
  const result = reconcile(schema, data, changes, scope);
  const outputs = buildFiles({ schema, data, result, changes, proposalsDir: proposals!, proposalFiles: files });
  await writeOutputs(out!, outputs);
  io.out(`reconciled ${files.length} proposal file(s): ${result.additions.length} additions, ${result.fieldUpdates.length} field updates, ${result.conflicts.length} conflicts (${result.held.length} held), ${result.suggestions.length} suggestions, ${result.rejected.length} rejected, ${result.reflected} already reflected\nwrote ${out}\n`);
}

async function validateCommand(args: string[], io: Io): Promise<void> {
  const { positional } = parse(args, []);
  if (positional.length !== 1) throw new InputError(["validate needs one file or folder", USAGE]);
  const valid = await validatePath(positional[0]!, await loadSchema(SCHEMA_PATH));
  io.out(valid.map((file) => `${file}: ok\n`).join(""));
}

export async function run(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === "reconcile") await reconcileCommand(rest, io);
    else if (command === "validate") await validateCommand(rest, io);
    else throw new InputError(command === undefined ? [USAGE] : [`unknown command "${command}"`, USAGE]);
    return 0;
  } catch (error) {
    io.err(((error as InputError).messages ?? [(error as Error).message]).join("\n") + "\n");
    return 1;
  }
}
