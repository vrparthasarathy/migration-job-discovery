# Contract

## Contract

### Command

`node src/main.ts generate --vendor <name> --out <file.xlsx> --as-of <YYYY-MM-DD> [--data <folder>]`

- `--vendor` is the vendor name exactly as in the sample data. `--data` defaults to the Sample Tracker Workbook's `data/` folder.
- Exit 0 and the file on success. Exit 1 with every finding on standard error and no file on an unknown vendor or invalid data. Exit 2 on bad usage. The file is written to a temporary name and renamed.

### Sheets, in order

Read Me, Use Cases, Questions, Identity & Access. Main sheets: row 1 column-group band, row 2 Excel table header with the sample's friendly headings, header cells blue (vendor-visible), frozen rows and key columns, filters on, readable widths, wrapped text, dates as real dates, nothing hidden.

### Rows and columns

- Use Cases: the vendor's use cases. Questions: the vendor's questions with `released_on` set. Identity & Access: the vendor's access rows. Order as in the data.
- Columns: every `V` column of the tab in `data/headings.csv`, in file order. `Questions > Due on` is the release date plus two working days.
- Shaded data cells: the columns of the Vendor Workbook Updater's `data/vendor-edited.csv` that are shown.

### Read Me

Title, one sentence on what the file is, the shaded cells by sheet, the due-date rule, the answer statuses, the no-secrets reminder, and what is not included. It contains no vendor other than the named one and no internal term.

### Findings

`file: line N: message` for the data files, as the sample's `generate`; an unknown vendor names the vendor and lists the vendors the data holds.
