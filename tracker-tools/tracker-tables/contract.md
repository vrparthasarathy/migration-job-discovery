# Contract

## Contract

### Module interface

| Module | Provides |
| --- | --- |
| `csv` | `readCsv(path)` returns the header and rows (RFC 4180, byte order mark and CRLF tolerated); `writeCsv(path, header, rows)` writes UTF-8, LF, quoting only where needed; `parseCsv(text, file)` and `formatCsv(header, rows)` do the same on strings; `splitList(value)` and `joinList(items)` read and write `;` multi-value fields in order. A table is `{ file, header, rows }` with each row a column-to-value record. |
| `schema` | `loadSchema(path)` reads the contract's `tracker-schema.csv`; `validateTable(schema, tab, table)` reports missing columns (error), unknown columns (warning, preserved), bad statuses, references and dates with file, row and field (a finding is `{ severity, file, row?, field, message }`, with the header as row 1); `getTab(schema, tab)` throws for an unknown tab and lists the known tabs; `tabFileName(tab)` gives the kebab-case file name; `orderHeader` and `writeTable` write schema column order with unknown columns after it; `formatFinding` renders a finding as one line. |
| `vendor_view` | `vendorView(schema, tables, vendor)` returns only that vendor's rows and vendor-visible columns, question rows only after `released_on`, no Question Groups, Question Links or Mappings tab, and no reference to an unreleased row or another vendor's row. |
| `working_days` | `addWorkingDays(date, n, holidays)` and `isOverdue(today, dueOn, answerStatus, status)`; weekends and listed holidays are skipped; overdue after `due_on` for an open question row (`released` or `clarification-requested`) whose status is `clarification-requested` or whose answer status is not `answered`, so a complete answer awaiting lead review (`released` and `answered`) is not vendor-overdue; a response never moves `due_on`; `dueOn(releasedOn, holidays)` is `addWorkingDays(releasedOn, 2, holidays)`; `isIsoDate(value)` and `readHolidays(path)` (one `YYYY-MM-DD` per line) support them. |
| `use_case_id` | `useCaseId(vendor, name)` returns `uc-<vendor-slug>-<use-case-slug>`, each part lower case with each run of characters outside `a-z` and `0-9` replaced by one `-` and leading and trailing `-` trimmed; it returns `undefined` when either slug is empty. It is the one implementation of the use case ID the tools import; the ID is derived from the `vendor` and `use_case_name` columns and never stored or validated against the schema. |

### Data rules

- Dates are `YYYY-MM-DD`; multi-value fields are `;`-separated and keep their order.
- Unknown tab names are an error that lists the known tabs.
- The schema is read from the Tracker Data Contract component's `tracker-schema.csv`; no column list is repeated in code.
