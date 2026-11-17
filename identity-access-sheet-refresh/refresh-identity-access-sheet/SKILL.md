---
name: refresh-identity-access-sheet
description: Takes one vendor's hand-filled Identity & Access sheet saved as CSV, and the source of the use cases in it, and writes a separate CSV in the sheet's own columns with values corrected from the source, missing endpoints added, evidence filled and every row marked in a trailing `change` column, so a developer can paste the tracker columns back into the sheet. Use when a developer or lead has an access sheet typed by hand and wants it checked against the source quickly, before the access records are adopted properly. It never edits the sheet, never writes a secret and never marks access requested, approved or verified.
user-invocable: true
---

# Refresh an Identity & Access sheet

You compare one vendor's hand-filled Identity & Access sheet with what the source of its use cases shows, and write a new CSV that a developer can paste back into the sheet. You correct values the source contradicts, add endpoints the source shows and the sheet lacks, fill `evidence_refs`, and mark every row in a trailing `change` column. You change nothing else and you write one file only.

You never edit the input sheet, the tracker or any proposal file. You never raise a request, approve anything or verify access. A developer reviews the changed rows before pasting anything back.

Read `tracker-data-contract.md` and `tracker-schema.csv` in this folder before you write a row. They are the only source for column names and owner classes (column `owner`: `spec`, `human`, `forbidden`, `computed`). If they and this file disagree, they win, and you say so in your reply.

## Inputs

- The sheet, saved as CSV. Its header holds the tracker's Identity & Access column names. It may have extra columns of the developer's own.
- For each use case in the sheet: its source and configuration, and the files `external_tools.md` and `logic.md`, looked for in the use case's folder or where the developer says they are. If one is missing, say so in the report; never invent its content.
- The map from each `use_case_ref` value in the sheet to the use case's folder. If the developer gives none, look up the use case's `folder` in the use case index or inventory if one is given. If a use case cannot be tied to a folder, ask once; if there is still none, its rows are `not in source`.
- The scope: the use cases (`use_case_ref` values) or the vendor to process. If the developer names none, ask once. A lead may split a large sheet by running one use case or one vendor at a time. Write only the rows in scope.
- Optionally the path for the output file.

## What you write

One new CSV: `access-sheet-refresh/<sheet-stem>[-<scope>]-refreshed.csv` (`<sheet-stem>` is the sheet's file name without `.csv`; `<scope>` is the use case or vendor named, as a slug, left out when the whole sheet is in scope). Create the folder if it is missing. The developer may name another path. Write nowhere else, and never overwrite or change the input sheet.

Format: UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting (quote any value with a comma, a double quote or a line break, and double the quotes inside), LF line ends, one header row, no blank line between rows, exactly one line feed after the last row.

Header: the sheet's own columns in the sheet's order, then a last column `change`. A column the sheet has beyond the schema is kept, in place, and copied through.

Rows keep the sheet's order. A `new` row follows the last row of its use case, ordered by endpoint, then environment. Each sheet row in scope appears exactly once.

## Which columns you may change

Look each column up in `tracker-schema.csv`, column `owner`.

- Spec columns you may write: `vendor`, `service`, `endpoint`, `environment`, `auth_type`, `observed_operations`, `identity_reference`, `observed_access`, `proposed_access`, `permissions_to_confirm`, `unknowns`, `evidence_refs`.
- Every human column (`access_ref`, `use_case_ref`, `unknown_owner`, `our_coordinator`, `vendor_action_owner`, `request_status`, `additional_requirements`, `next_action`, `next_action_owner`, and any other with owner `human`), every forbidden column (`ticket_ref`, `raised_on`, `expected_availability`, `verification`, `verified_by`, `verified_on`), every computed column and every column beyond the schema is copied exactly as typed, character for character. On a `new` row they are blank, except `use_case_ref`, which is taken from the use case's other rows (see below).
- Never generate a value for a forbidden or computed column, and never invent a request, an approval, a ticket, a date, an availability or a verification, even where the source seems to show one.
- A spec field is rewritten only where the source shows a concrete value that differs from the sheet's, or fills a blank field with a value the source shows. Where the source is silent, the developer's text stays as typed. A field the source cannot show (for example `proposed_access` when the source says nothing about what to request) is not rewritten.
- `shared_request_flag`, `shared_with` and the other internal columns are not computed here; copy them through if the sheet has them.

## Matching a sheet row to a source finding

First read the evidence (see below) to get findings: one per distinct use case, endpoint and environment.

The key of a row is the use case, the endpoint and the environment. Normalize for matching only, never for writing, except where the source shows the fact:

- Trim and lower-case. For a URL, drop the scheme, the trailing slash and a default port, and lower-case the host. A setting name such as `CHECK_URL` is kept as written. A blank environment equals `unknown`. Treat `prod` and `production` (or any other pair of aliases) as one environment only when the source or the developer says so.

Then pair, in this order:

1. Exact: same use case, endpoint and environment after normalization. Make the pair.
2. Loose: the same use case and endpoint with one environment blank or `unknown` and the other named; or the sheet endpoint is a setting name where the source shows the resolved URL; or the same host with a different path. Make the pair only if it is one-to-one and unambiguous, meaning exactly one sheet row and exactly one finding are candidates for each other. The result is one `corrected` row, with the source's endpoint and environment, and the report names the loose pairing and what differed.
3. Otherwise: the sheet row is `not in source` and the finding is `new`.

If several sheet rows or several findings are candidates for each other, pair nothing: each sheet row is `not in source`, each finding is a `new` row, and the report lists them together as a possible match for the developer to decide. A row or finding is never used twice and no duplicate row is made.

## The `change` column

- `unchanged`: a pair where no tracker cell differs after the source-backed fields are standardized, and `evidence_refs` was already complete (it holds `source:` pointers for the source read). Copy the row as it is. Running this skill on its own output, with the `change` column removed, gives `unchanged` for every row it found evidence for.
- `corrected`: a pair where the source contradicts or standardizes a value (including filling a blank spec field the source shows), or where `evidence_refs` was blank or incomplete and is now filled. Filling `evidence_refs` alone makes the row `corrected`.
- `new`: a finding that no sheet row pairs with. Write `vendor` and `use_case_ref` as the use case's other sheet rows have them, every spec field from the source (write `unknown` for `environment` and `auth_type` where the source shows none; leave `identity_reference` blank where it shows no name), `evidence_refs` with `source:` pointers, and leave every human column other than `use_case_ref`, every forbidden column, every computed column and every extra column blank. Do not suggest `request_status` or `unknown_owner`.
- `not in source`: a sheet row with no source evidence: no source for its use case, a missing `external_tools.md` or `logic.md` that it relies on, a use case with no folder, or an endpoint nothing in the source shows. Copy the row exactly, change nothing, never delete it, never correct or guess at it. The report lists it with the reason. A `not in source` row's existing pointers (for example `document:`) stay.

`change` exists only in the output file. The developer pastes only the tracker columns back.

## Reading the evidence

Read the source and configuration, `external_tools.md` and `logic.md` of each use case in scope. Look only for what the use case reaches outside itself for: configuration and environment variable reads, URLs and hosts, web page visits and sign-in steps, API and SDK clients, database, queue, file transfer and mail connections, authorization headers, tokens, key or certificate references, and the names of environments. You do not need to understand the whole use case.

- `service` is the outside system in plain words from the evidence. `endpoint` is the host, URL, queue, bucket or path the evidence shows; where it gives only the name of the setting that holds it, write that name (its runtime value is unknown). `environment` is the one the evidence names, otherwise `unknown`.
- `observed_operations` describes only what the source does with the endpoint: the method and call, with the setting names it uses.
- `auth_type` is one of `website-sign-in`, `api-credential`, `other`, `unknown`. A call with no credential in the source is `unknown`, because the source cannot show whether the service would ask for one.
- `observed_access` is only what the evidence shows the use case does and with what; it is never mixed with `proposed_access`. Where the source contradicts the sheet's `observed_access`, replace it with what the source shows.
- Never guess a vendor, host, identity name, permission or scope.

### Evidence pointers

`evidence_refs` is a `;`-list of pointers.

- `source:<path>#L<a>-L<b>` for a source or configuration file you read. `<path>` is the path from the root of the repository (or from the folder the developer names), and `L<a>-L<b>` is the line range that shows the fact. Read the lines; never write a range you did not read.
- Pointers already in the sheet cell (`document:<name or path>#<place>`, `dependency:<who supplied it and where>`) are kept, before the pointers you add, separated by `;`.
- A row whose pointers are all `document:` or `dependency:` rests on a document or a statement, not on source. Do not describe it as source-confirmed or source-verified; in the report say it rests on a document or a supplied observation only.

### Identities and secrets

- `identity_reference` holds the exact names the evidence shows (environment variable names, vault or secret-store reference names, service account names, identity or role names), with runtime values `unknown`. Keep the developer's names; add a name the source shows only when the cell is blank.
- A literal credential (a password, token, key, secret or connection string with credentials) found in the source, the sheet or a document is reported as its location (file and line, or the sheet row and column) and `value withheld`. Never copy it, any part of it, its length or a masked form into the output file, the report or your reply. Say that it should be replaced by a reference or by provisioning, and that approval is by secure reference or provisioning only.
- A secret typed into a sheet cell is replaced by `value withheld` in the output file, and the report names the cell (row and column) without the value.
- Reuse of an existing CI identity is `unconfirmed`; never state that it will be reused.

## Self-check before you report

After you write the file and before you write the report, read the file back and check it. Fix every problem, then check again, until none is left:

1. Every row, including the header, has the same number of fields as the header. Count fields the way CSV does: a comma, a double quote or a line break inside a quoted value is part of that value.
2. Every value that holds a comma, a double quote or a line break is quoted, and every quote inside a quoted value is doubled.
3. The header is the sheet's own header followed by `change`.
4. Every human, forbidden, computed and extra column in every row equals the input exactly (blank on a `new` row, except `use_case_ref`), apart from a secret replaced by `value withheld`.
5. No secret value, or part of one, is present.
6. The file ends with exactly one line feed, with no blank line after the last row.
7. Every `source:` pointer you wrote names a file you read, and its line range exists in that file.
8. Every sheet row in scope appears once, no finding is used twice, and there is no duplicate key.

State the result in the report: clean, or the problems found and fixed.

Running again on the same inputs must give a byte-identical file: keep the fixed row order, quoting and line ends above.

## Report

End your reply with a report in plain words, with these parts. Write `none` for an empty part; never leave one out.

1. The output file path, and the scope you processed.
2. The count of rows per `change` value.
3. Loose pairings: each pair, and what differed.
4. Possible matches: each ambiguous case, with the sheet rows and findings that could be the same, for the developer to decide.
5. `not in source` rows: each with its reason.
6. Use cases with no folder, and unread files (including a missing `external_tools.md` or `logic.md`).
7. Rows that rest only on a document or a supplied observation, so they are not read as confirmed in source.
8. Cells where a secret was replaced by `value withheld` (row and column only), and literal credentials found in the source or documents (location and `value withheld`).
9. Facts in an input that belong to a lead or to a later step and that you did not generate (a ticket, a raised date, an approval, an availability, a verification).
10. The self-check result.
11. That the developer pastes only the tracker columns back (not `change`), and reviews the `corrected`, `new` and `not in source` rows first.

State in the report that this is a stopgap refresh of a hand-filled sheet; approval or provisioning of access is separate from verified working access, and the developer or the platform team verifies working access.

## Always

- No secret value in the output or the report.
- Write one file; do not touch the input sheet, the tracker or any proposal file.
- Do not describe changes anyone might want or any design for the new platform: you carry only what the evidence shows.
- Do not cover network connectivity, environment setup or router availability.
- `example-access-sheet.csv` and `example-access-sheet-refreshed.csv` show a corrected row and a `not in source` row for the website availability check use case under the fictional vendor `Example Vendor`; `example-ambiguous-sheet.csv` and `example-ambiguous-sheet-refreshed.csv` show an ambiguous case (two loose candidates for one finding), which gives two `not in source` rows and one `new` row. They are a model of the format only; never copy their values into another use case.
