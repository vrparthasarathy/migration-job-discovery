# Contract

## Contract

### Skill input and output

| Part | Content |
| --- | --- |
| Skill name | The `name` in the `SKILL.md` front matter is `refresh-identity-access-sheet`, identical to the folder name. |
| Input | One vendor's Identity & Access sheet saved as CSV with the tracker's column headings; the source and configuration of each use case in it, `external_tools.md` and `logic.md` where present; the map from each `use_case_ref` value to its folder (with no folder given, the use case's index row `folder`); the use cases or vendor in scope. |
| Output | One new CSV, `access-sheet-refresh/<sheet-stem>[-<scope>]-refreshed.csv` (the developer may name another path), and a report. Nothing else is written. |
| Folder | `SKILL.md`, byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv` from the [Tracker Data Contract](../tracker-data-contract/README.md#purpose) component, and the example sheet and its expected output named in the plan. |

### Matching and normalization

The key of a row is the use case, the endpoint and the environment. Normalization is for matching only and is never written back except where the source shows the fact.

- Use case: the sheet's `use_case_ref`, tied to a folder by the developer's map or, with none given, the use case's index row `folder`. A row whose use case has no folder is `not in source`.
- Normalization: trim and lower-case. For a URL, drop the scheme, the trailing slash and a default port, and lower-case the host. A setting name such as `CHECK_URL` is kept as written. A blank environment equals `unknown`. Environment aliases (`prod`, `production`) are one environment only when the source or the developer states it.
- Tier 1, exact: all three parts equal after normalization. The pair is made.
- Tier 2, loose: the same use case and endpoint with one environment blank or `unknown` and the other named; or the sheet endpoint is a setting name where the source shows the resolved URL; or the same host with a different path. A loose pair is made only when it is one-to-one and unambiguous; with several candidates nothing is paired.
- Tier 3, otherwise: the sheet row is `not in source` and the finding is `new`.
- Each finding is used at most once and each sheet row appears exactly once. A loose pair becomes one `corrected` row with the source's endpoint and environment. An ambiguous case gives a `not in source` row plus a `new` row, and the report lists them as a possible match so a person decides before anything merges.

### The `change` column

| Value | Meaning |
| --- | --- |
| `unchanged` | A pair where no tracker cell differs after the source-backed fields are standardized and `evidence_refs` was already complete. |
| `corrected` | A pair where the source contradicts or standardizes a value, or `evidence_refs` was blank or incomplete and is now filled. |
| `new` | A source finding no sheet row pairs with; spec fields from the source, human-owned and forbidden columns blank. |
| `not in source` | A sheet row with no source evidence; copied unchanged. |

`change` is the last column and exists only in the output file. The developer pastes only the tracker columns back.

### Output file and row order

- UTF-8 without a byte order mark, RFC 4180 quoting (a value with a comma, a double quote or a line break is quoted), LF line ends, one header row, one final line feed, no blank line between rows.
- The header is the sheet's own columns in the sheet's order, then `change`. A column the sheet has beyond the schema is kept and copied through.
- Rows keep the sheet's order. A `new` row follows the last row of its use case, ordered by endpoint then environment. Only the use cases or vendor in scope are written.
- Human-owned and forbidden columns are copied exactly as typed, including `access_ref`, `use_case_ref`, `unknown_owner`, the coordinator and owner columns, `request_status`, `ticket_ref`, `raised_on`, `expected_availability` and `verification`. A secret typed into any cell is replaced by `value withheld`.
- `evidence_refs` is `;`-separated pointers. Pointers the skill adds are `source:<path>#L<a>-L<b>`; existing `document:` and `dependency:` pointers are kept.

### Handling of identities

- Identity references are names and variable references only, with runtime values `unknown`. A literal credential found in the source, the sheet or a document is reported as its location and `value withheld`.
- The skill never writes the coordinator, the vendor action owner, a ticket, a raised date, an expected availability or a verification, and never marks anything approved, provisioned or verified.

### Report parts

The reply states, in plain language: the output file path; counts per `change` value; each loose pairing and what differed; each ambiguous case listed as a possible match; each `not in source` row with the reason; use cases with no folder; unread files; the cells where a secret was replaced; the result of the read-back check; and that the developer pastes only the tracker columns back and reviews the changed rows first.

## Planned change: restated evidence rules and drift check

- **Handling of identities.** `identity_reference` names are written `NAME (runtime value unknown)`; a value is never taken from a runtime, a log or a CI setting. Reuse of an existing CI identity is listed in `unknowns` as exactly `reuse of an existing CI identity: unconfirmed`.
- **Prefix.** The document-only prefixes are exactly `From a supporting document, not confirmed in source:` and `From a supplied observation, not confirmed in source:`.
- **Allowed `auth_type` values.** The output cell holds exactly one of `website-sign-in`, `api-credential`, `other` or `unknown`, as listed in the schema copy. The type the source shows is written; where the source is silent and the developer's free text unambiguously names one kind (a sign-in, SSO or login page, or an API key, token or credential), that kind; otherwise `unknown`.
- **Text columns.** Spec text columns keep the discovery skill's shapes (`observed_operations` the method and call with setting names, `identity_reference` names only, `unknowns` a `;`-list, `evidence_refs` `source:` pointers). The developer's wording is rewritten only where a rule sets the value, and is never shortened on the skill's own initiative.
- **Report parts.** The third part also lists the rows whose `proposed_access` was rewritten because `auth_type` was set or corrected, by row and column only. A further part lists each row whose `auth_type` was changed to an allowed value, by row and column with the developer's original wording, and another lists every human-owned or forbidden value outside its allowed list or format (the enums `request_status` and `verification`, a date that is not `YYYY-MM-DD`, an `expected_availability` that is neither a date nor `unknown`), by row and column, left unchanged.
- The output file, the header, the `change` values, the row order and the matching rules do not change.
