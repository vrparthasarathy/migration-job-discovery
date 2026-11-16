# Contract

## Contract

### Commands

- `python3 src/build.py build [--out <zip>] [--repo <dir>] [--payload <file>]`: writes the zip. `--repo` defaults to the repository root (the parent of this component), `--payload` to `payload.txt` of the component, `--out` to `dist/AIRO-Client-Transfer.zip`. Exit 0 on success. Exit 1 with every finding on standard error and no zip on a missing listed file, a forbidden file, a secret-like value or a failed verification. Exit 2 on bad usage. The zip is written to a temporary name and renamed.
- `python3 src/build.py verify <zip> [--repo <dir>]`: restores the zip into a clean temporary directory, compares every restored file byte for byte with its source in `--repo`, checks the manifest, checks the zip and that every member ends in `.txt`, and runs the packaged tests where Node 26 is available. Exit 0 or 1; prints each check with its result and says which checks were skipped and why.

### Zip layout

- Root: `MANIFEST.json.txt`, `START-HERE.txt`, `COPILOT-RESTORE-PROMPT.txt`, `CLIENT-QUICKSTART.md.txt`, `VERIFICATION.txt`, `PROCESS-GUIDE.md.txt`, `restore.py.txt`.
- `payload/<original path>.txt` for every payload file.
- Members are in sorted order with a fixed timestamp (1980-01-01), fixed permissions and deflate compression, so two builds of the same checkout are byte-identical.

### Manifest (`MANIFEST.json.txt`)

UTF-8 JSON: `{ "package": "AIRO-Client-Transfer", "format": 1, "source_revision": "<git revision, with +dirty when the working tree has uncommitted changes, or unknown when not a git checkout>", "files": [ { "path": "<original relative path, forward slashes>", "packaged": "payload/<path>.txt", "size": <bytes> } ] }`, files sorted by `path`. No hash, no timestamp, no absolute path.

### `restore.py`

- `python3 restore.py <zip-or-unzipped-folder> <destination>`; the destination must not exist.
- Before writing anything it checks: the manifest reads, each `path` is relative with no `..`, no drive letter and no leading slash, each `packaged` member exists with the stated size, and no payload member is unlisted.
- It writes each file to `<destination>/<path>` with the exact bytes, creating folders, then prints a count. It installs nothing, runs nothing and changes nothing outside the destination.
- Exit 0 on success. Exit 1 with each problem named and the destination not created on a missing, mis-sized, unlisted or unsafe member or an existing destination. Exit 2 on bad usage.

### Instruction texts (templates in `templates/`, rendered at build)

- `START-HERE.txt`: contents, how to transfer, how to rename `restore.py.txt` to `restore.py`, how to restore, how to hand the prompt to Copilot.
- `COPILOT-RESTORE-PROMPT.txt`: a ready-to-paste prompt for Copilot Agent mode with these rules: inspect repository instructions and `restore.py`; restore and verify into a fresh approved staging folder; install each skill folder into `.github/skills` (or the project's established skill location) replacing existing copies of the same skills and listing what was replaced; confirm actual skill discovery rather than assuming copying activates it; copy the tools and tests preserving runtime-relative paths into one folder; flag differing existing files elsewhere before overwriting and leave identical ones alone; never replace `AGENTS.md` or unrelated configuration; check prerequisites and run the packaged tests when available; report installed paths, results, conflicts and remaining manual checks; make no commits, pushes, releases, access changes or external endpoint calls.
- Planned change (Lead Tracker Skills): `CLIENT-QUICKSTART.md.txt` names no Node and no `node --test` command, and `VERIFICATION.txt` records no packaged tests; the quickstart points to each lead tracker skill's `golden/COMPARE.md`. The restore prompt works without running `restore.py`.
- `CLIENT-QUICKSTART.md.txt`: prerequisites (Node 26, Python 3.9 or later) and the exact commands, each checked by `build` against the manifest: `node --test "test/*.test.ts"` from the restored root, and `node --test "tracker-tools/<tool>/test/*.test.ts"` per tool.
- `VERIFICATION.txt`: the checks `build` actually performed on the payload (restore to a clean directory, byte comparison, manifest, zip, member names, and the packaged tests with their counts, or why they were skipped) and the checks left for the client environment (Copilot skill discovery, each skill on a real use case, the client's Node version, the client's `.github/skills` location). It states that none of the skills or use cases is validated by these checks. It holds no timestamp or duration.
- `PROCESS-GUIDE.md.txt`: the end-to-end handoffs table of the root `contract.md`, with the surrounding sentence, copied unchanged and prefixed by one line saying where it comes from.
- All texts say "Copilot".

### Payload list (`payload.txt`)

One repository-relative path or glob per line, forward slashes, `#` comments. A line that matches no file, or a path that matches an exclusion rule, is a finding.

### Fixtures in tests

Test fixture trees are written into temporary directories at test time and never committed under the component, so the repository holds no extra copy of `tracker-data-contract.md` or `tracker-schema.csv` (the root test counts them).
