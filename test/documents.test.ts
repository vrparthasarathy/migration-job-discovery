import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { root } from "./support.ts";

const template = join(root, "job-behavior-template", "job-behavior-template.md");
const specification = join(root, "website-check-job-behavior", "website-availability-check.md");
const skillCopy = join(root, "copilot-drafting-guide", "document-job-behavior", "job-behavior-template.md");

const contractDir = join(root, "tracker-data-contract");
const skillFolders = ["tracker-update-proposer/propose-tracker-updates", "identity-access-discovery/discover-identity-access", "workflow-recommender/recommend-workflows"];
const contractFiles = ["tracker-data-contract.md", "tracker-schema.csv"];

/** The part headings in order, with the document title (which names the use case) reduced to its fixed prefix. */
async function headings(path: string): Promise<string[]> {
  return (await readFile(path, "utf8"))
    .split("\n")
    .filter((line) => /^#{1,6} /.test(line))
    .map((line) => (line.startsWith("# ") ? line.replace(/:.*$/, "") : line));
}

/** The first-column ID of every table row that carries an anchor, for example `B1`, `Q2`, `AC3`. */
async function ids(path: string): Promise<string[]> {
  return [...(await readFile(path, "utf8")).matchAll(/^\| <a id="([a-z]+\d+)"><\/a>([A-Z]+\d+) \|/gm)].map((m) => `${m[1]}=${m[2]}`);
}

test("[B01] the template, the reference specification and the skill's copy share the same part headings in the same order", async () => {
  const fromTemplate = await headings(template);
  assert.ok(fromTemplate.length >= 12, "the template has its parts");
  assert.equal(fromTemplate[0], "# Use Case Behavior");
  assert.deepEqual(await headings(specification), fromTemplate, "specification headings");
  assert.deepEqual(await headings(skillCopy), fromTemplate, "skill copy headings");
});

test("[B01] the three documents use the same ID scheme (B, Q, AC) with matching lowercase anchors", async () => {
  for (const path of [template, specification, skillCopy]) {
    const found = await ids(path);
    assert.ok(found.length > 0, path);
    for (const entry of found) {
      const [anchor, id] = entry.split("=");
      assert.equal(anchor, id!.toLowerCase(), `${path}: anchor ${anchor} matches ID ${id}`);
      assert.match(id!, /^(B|Q|AC)\d+$/);
    }
    for (const prefix of ["B", "Q", "AC"]) assert.ok(found.some((entry) => new RegExp(`=${prefix}1$`).test(entry)), `${path} has ${prefix}1`);
  }
  const numbered = (await ids(specification)).map((entry) => entry.split("=")[1]!);
  for (const prefix of ["B", "Q", "AC"]) {
    const numbers = numbered.filter((id) => id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length))).map((id) => Number(id.slice(prefix.length)));
    assert.deepEqual(numbers, numbers.map((_, index) => index + 1), `${prefix} IDs in the specification run 1, 2, 3 ...`);
  }
});

test("[B01] the template copy inside the skill folder is identical to the template", async () => {
  assert.equal((await readFile(skillCopy)).equals(await readFile(template)), true);
});

async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else found.push(path);
  }
  return found;
}

test("[B05] every skill folder that uses the tracker contract holds byte-identical copies of the contract and schema", async () => {
  for (const file of contractFiles) {
    const original = await readFile(join(contractDir, file));
    assert.ok(original.length > 0, file);
    for (const folder of skillFolders) {
      const copy = await readFile(join(root, folder, file)).catch(() => undefined);
      assert.ok(copy, `${folder}/${file} exists`);
      assert.equal(copy.equals(original), true, `${folder}/${file} is identical to the contract component's file`);
    }
  }
});

test("[B05] no other copy of the contract or schema exists, and the tools read the schema from the contract component", async () => {
  const all = await walk(root);
  const copies = all.filter((path) => contractFiles.some((file) => path.endsWith(`/${file}`))).map((path) => path.slice(root.length)).sort();
  const expected = [...contractFiles.map((f) => `tracker-data-contract/${f}`), ...skillFolders.flatMap((d) => contractFiles.map((f) => `${d}/${f}`))].sort();
  assert.deepEqual(copies, expected, "the contract component and the three skill folders hold the only copies");
  for (const tool of ["tracker-reconciler", "tracker-summary"]) {
    const source = await readFile(join(root, "tracker-tools", tool, "src", "cli.ts"), "utf8");
    assert.match(source, /\.\.\/\.\.\/\.\.\/tracker-data-contract\/tracker-schema\.csv/, `${tool} reads the schema from the contract component`);
  }
});
