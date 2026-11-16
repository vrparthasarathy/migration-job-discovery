import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

/** Adds a problem when `out` or `report` is an input, each other, inside the export folder or an existing folder. */
export async function checkPaths(out: string, report: string, inputs: string[], exportDir: string, problems: string[]): Promise<void> {
  const [o, r, e] = [resolve(out), resolve(report), resolve(exportDir)];
  if (o === r) problems.push("--out and --report must be different files");
  for (const [flag, target] of [["--out", o], ["--report", r]] as const) {
    if (inputs.some((input) => resolve(input) === target)) problems.push(`${flag} ${target === o ? out : report} is also an input file`);
    if (target.startsWith(e + sep)) problems.push(`${flag} ${target === o ? out : report} is inside the export folder`);
    if ((await stat(target).catch(() => undefined))?.isDirectory()) problems.push(`${flag} ${target === o ? out : report} is a folder`);
  }
}

/**
 * Writes every file to a temporary name beside its target and renames them in the order given, so a failure before the renames leaves every target as it was.
 * Parent folders of the targets are created.
 */
export async function writeAll(files: { path: string; content: string | Buffer }[]): Promise<void> {
  const temps = files.map((f) => ({ ...f, temp: `${f.path}.${process.pid}.tmp` }));
  try {
    for (const f of temps) {
      await mkdir(dirname(f.path), { recursive: true });
      await writeFile(f.temp, f.content);
    }
    for (const f of temps) await rename(f.temp, f.path);
  } finally {
    for (const f of temps) await rm(f.temp, { force: true });
  }
}
