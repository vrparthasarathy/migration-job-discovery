import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatCsv, joinList, parseCsv, readCsv, splitList, writeCsv } from "../src/csv.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "tracker-tables-csv-"));
  dirs.push(dir);
  return dir;
}
after(async () => {
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

test("[B01] quoted fields keep commas, newlines and doubled quotes", () => {
  const table = parseCsv('a,b,c\n"x, y","line1\nline2","say ""hi"""\n', "t.csv");
  assert.deepEqual(table.header, ["a", "b", "c"]);
  assert.deepEqual(table.rows, [{ a: "x, y", b: "line1\nline2", c: 'say "hi"' }]);
  assert.equal(table.file, "t.csv");
});

test("[B01] a byte order mark and CRLF line ends are tolerated", () => {
  const table = parseCsv("﻿a,b\r\n1,2\r\n3,4\r\n", "t.csv");
  assert.deepEqual(table.header, ["a", "b"]);
  assert.deepEqual(table.rows, [
    { a: "1", b: "2" },
    { a: "3", b: "4" },
  ]);
});

test("[B01] LF and bare CR line ends, a missing final newline and blank lines are tolerated", () => {
  const table = parseCsv("a,b\n1,2\n\n3,4\r5,6", "t.csv");
  assert.deepEqual(table.rows, [
    { a: "1", b: "2" },
    { a: "3", b: "4" },
    { a: "5", b: "6" },
  ]);
});

test("[B01] a CRLF inside a quoted field is kept as data", () => {
  const table = parseCsv('a\r\n"x\r\ny"\r\n', "t.csv");
  assert.deepEqual(table.rows, [{ a: "x\r\ny" }]);
});

test("[B01] a quoted empty field is a value, an empty field is empty, a stray quote is literal", () => {
  const table = parseCsv('a,b,c\n"",,x"y\n', "t.csv");
  assert.deepEqual(table.rows, [{ a: "", b: "", c: 'x"y' }]);
  assert.deepEqual(parseCsv('a\n""\n', "t.csv").rows, [{ a: "" }]);
});

test("[B01] a short row is padded with empty values", () => {
  const table = parseCsv("a,b,c\n1\n", "t.csv");
  assert.deepEqual(table.rows, [{ a: "1", b: "", c: "" }]);
});

test("[B01] an empty text has no header and no rows", () => {
  assert.deepEqual(parseCsv("", "t.csv"), { file: "t.csv", header: [], rows: [] });
});

test("[B01] a long row, an unterminated quote and a duplicate column are errors naming the file", () => {
  assert.throws(() => parseCsv("a,b\n1,2,3\n", "t.csv"), /t\.csv.*row 2.*3 fields.*2/);
  assert.throws(() => parseCsv('a\n"open\n', "t.csv"), /t\.csv.*unterminated/);
  assert.throws(() => parseCsv("a,a\n1,2\n", "t.csv"), /t\.csv.*duplicate column "a"/);
});

test("[B01] readCsv reads a UTF-8 file from disk and names a missing file", async () => {
  const dir = await tempDir();
  const path = join(dir, "t.csv");
  await writeFile(path, "﻿name,note\r\nCafé,\"a,b\"\r\n", "utf8");
  const table = await readCsv(path);
  assert.equal(table.file, path);
  assert.deepEqual(table.rows, [{ name: "Café", note: "a,b" }]);
  await assert.rejects(() => readCsv(join(dir, "missing.csv")), /missing\.csv/);
});

test("[B02] rows are written with LF line ends and quoting only where needed", () => {
  const out = formatCsv(
    ["a", "b", "c"],
    [
      { a: "plain", b: "x, y", c: 'say "hi"' },
      { a: "line1\nline2", b: "", c: "cr\rhere" },
    ],
  );
  assert.equal(out, 'a,b,c\nplain,"x, y","say ""hi"""\n"line1\nline2",,"cr\rhere"\n');
  assert.equal(out.includes("\r\n"), false);
});

test("[B02] a header without rows is one line, a missing key is empty and a lone empty value is quoted", () => {
  assert.equal(formatCsv(["a", "b"], []), "a,b\n");
  assert.equal(formatCsv(["a", "b"], [{ a: "1" }]), "a,b\n1,\n");
  const out = formatCsv(["a"], [{ a: "" }, { a: "x" }]);
  assert.equal(out, 'a\n""\nx\n');
  assert.deepEqual(parseCsv(out, "t.csv").rows, [{ a: "" }, { a: "x" }]);
});

test("[B02] a row key that is not in the header is an error", () => {
  assert.throws(() => formatCsv(["a"], [{ a: "1", zzz: "2" }]), /zzz/);
});

test("[B02] writeCsv writes UTF-8 without a byte order mark", async () => {
  const dir = await tempDir();
  const path = join(dir, "out.csv");
  await writeCsv(path, ["a"], [{ a: "É" }]);
  const bytes = await readFile(path);
  assert.deepEqual([...bytes.subarray(0, 3)], [0x61, 0x0a, 0xc3]);
  assert.equal(bytes.toString("utf8"), "a\nÉ\n");
});

test("[B02] a read followed by a write is stable, even from a BOM and CRLF file", async () => {
  const dir = await tempDir();
  const source = join(dir, "source.csv");
  await writeFile(source, '﻿a,b,c\r\n"x, y","l1\nl2",plain\r\n,"say ""hi""",\r\n', "utf8");
  const first = await readCsv(source);
  assert.deepEqual(first.rows, [
    { a: "x, y", b: "l1\nl2", c: "plain" },
    { a: "", b: 'say "hi"', c: "" },
  ]);
  const one = join(dir, "one.csv");
  await writeCsv(one, first.header, first.rows);
  const second = await readCsv(one);
  assert.deepEqual(second, { ...first, file: one });
  const two = join(dir, "two.csv");
  await writeCsv(two, second.header, second.rows);
  assert.equal(await readFile(two, "utf8"), await readFile(one, "utf8"));
});

test("[B08] a multi-value field splits on ; and keeps its order", () => {
  assert.deepEqual(splitList("QN-0003; QN-0001;QN-0002"), ["QN-0003", "QN-0001", "QN-0002"]);
  assert.deepEqual(splitList(""), []);
  assert.deepEqual(splitList("a;;b; "), ["a", "b"]);
});

test("[B08] a multi-value field is written with ; and keeps its order", () => {
  assert.equal(joinList(["b", "a", "c"]), "b;a;c");
  assert.equal(joinList([]), "");
  assert.deepEqual(splitList(joinList(["z", "y", "x"])), ["z", "y", "x"]);
});
