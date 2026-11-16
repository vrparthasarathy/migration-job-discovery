# Contract

## Contract

### Shared check declarations

The group's `craft.json` declares `test`, `coverage`, `testGlob` and `adapterGlob` in the same style as `website-availability-check`. Adapter files are each member's `src/main.ts`.

### Command line (members)

| Command | Member | Reads | Writes |
| --- | --- | --- | --- |
| `reconcile --export <dir> --proposals <dir> [--scope <slug>] --out <dir>` | tracker-reconciler | tracker export directory (CSV per tab and `manifest.csv`), proposal directories | the reconciliation report and files named in the reconciler's contract |
| `validate <file-or-dir>` | tracker-reconciler | a `tracker-updates.csv` or an export directory | nothing; exit status and messages only |
| `summary --export <dir> [--date <YYYY-MM-DD>] [--holidays <file>] --out <file>` | tracker-summary | tracker export directory | one internal summary file |
| `update-vendor-workbook --workbook <downloaded.xlsx> --reviews <dir> --export <dir> --vendor <vendor> --out <file> --report <file> [--release-batch <ref> --release-date <date>]` | vendor-workbook-updater | the vendor workbook downloaded from SharePoint, the review CSVs, a tracker export | a new vendor workbook, a report and `applied_on` in the review CSVs; see its contract |

Exit status is 0 on success and 1 on a usage or input error; nothing is written on an error.
