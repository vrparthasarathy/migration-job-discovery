import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

export type Output = { flag: string; path: string };

/** Adds a problem for each output that is another output, an input file, inside an input folder or an existing folder. */
export async function checkPaths(outputs: Output[], inputs: string[], folders: string[], problems: string[]): Promise<void> {
  const seen = new Map<string, string>();
  for (const { flag, path } of outputs) {
    const target = resolve(path);
    const first = seen.get(target);
    if (first !== undefined) problems.push(`${flag} and ${first} must be different files`);
    seen.set(target, flag);
    if (inputs.some((input) => resolve(input) === target)) problems.push(`${flag} ${path} is also an input file`);
    if (folders.some((folder) => target.startsWith(resolve(folder) + sep))) problems.push(`${flag} ${path} is inside the export folder`);
    if ((await stat(target).catch(() => undefined))?.isDirectory()) problems.push(`${flag} ${path} is a folder`);
  }
}
