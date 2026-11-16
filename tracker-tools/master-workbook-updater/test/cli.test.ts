import assert from "node:assert/strict";
import { test } from "node:test";
import { cli } from "./support.ts";

const BASE = ["--master", "m.xlsx", "--out", "o.xlsx", "--report", "r.md"];

const BAD: [string, string[], RegExp][] = [
  ["no command", [], /^usage: update-master-workbook/],
  ["an unknown command", ["frobnicate"], /unknown command "frobnicate"/],
  ["an unknown argument", ["update-master-workbook", ...BASE, "--nope", "x"], /unknown argument "--nope"/],
  ["an argument that is not an option", ["update-master-workbook", "stray"], /unknown argument "stray"/],
  ["an option without a value", ["update-master-workbook", ...BASE, "--run-date"], /--run-date needs a value/],
  ["an option given twice", ["update-master-workbook", ...BASE, "--out", "p.xlsx"], /--out is given twice/],
  ["both bases", ["update-master-workbook", ...BASE, "--from-export", "e"], /exactly one of --master and --from-export/],
  ["no base", ["update-master-workbook", "--out", "o.xlsx", "--report", "r.md"], /exactly one of --master and --from-export/],
  ["no output", ["update-master-workbook", "--master", "m.xlsx", "--report", "r.md"], /needs --out/],
  ["no report", ["update-master-workbook", "--master", "m.xlsx", "--out", "o.xlsx"], /needs --report/],
  ["headings without reviews", ["update-master-workbook", ...BASE, "--headings", "h.csv"], /--headings needs --reviews/],
  ["a vendor without a place to write", ["update-master-workbook", ...BASE, "--new-vendor", "Acme"], /a named vendor needs --vendor-out/],
  ["a vendor that is not name=path", ["update-master-workbook", ...BASE, "--vendor", "Acme", "--vendor-out", "v"], /--vendor needs <vendor>=<path>/],
  ["a vendor without a path", ["update-master-workbook", ...BASE, "--vendor", "Acme=", "--vendor-out", "v"], /--vendor needs <vendor>=<path>/],
  ["a run date that is not a date", ["update-master-workbook", ...BASE, "--run-date", "11/20/2026"], /--run-date "11\/20\/2026" is not a date/],
];

for (const [name, args, pattern] of BAD) {
  test(`[B8] ${name} is bad usage, exit 2, and writes nothing`, async () => {
    const outcome = await cli(...args);
    assert.equal(outcome.status, 2);
    assert.match(outcome.stderr, pattern);
    assert.equal(outcome.stdout, "");
  });
}
