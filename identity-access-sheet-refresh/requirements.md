# Requirements: Identity Access Sheet Refresh

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The skill takes one vendor's hand-filled Identity & Access sheet saved as CSV, which carries the tracker's own column headings, and the source and configuration of the use cases in it, with `external_tools.md` and `logic.md` where present, and writes a separate CSV in the sheet's columns and order plus a trailing `change` column, so a developer can paste the tracker columns back into the sheet.
- A use case is identified by the sheet's `use_case_ref` and a developer-given map from each value to the use case's folder; with no folder given, the use case's index row `folder` is the lookup. A use case that cannot be tied to a folder has its rows marked `not in source`.
- It pairs a sheet row with a source finding by use case, normalized endpoint and normalized environment. A loose match is paired only when it is one-to-one and unambiguous; an ambiguous case gives a `not in source` row and a `new` row and the report lists them as a possible match. No row or finding is used twice and no duplicate is made.
- A spec field is rewritten only where the source shows a concrete different value; where the source is silent the developer's text stays. `evidence_refs` is filled with `source:` pointers; existing `document:` and `dependency:` pointers are kept and a row resting only on them is not described as source-confirmed.
- Human-owned and forbidden columns, and any column beyond the schema, are copied exactly as typed. The skill never generates a value for a forbidden column and never invents a value, request, approval, ticket or availability fact. New rows leave the human-owned columns blank.
- A row with no source evidence is copied unchanged and marked `not in source`, with the reason in the report. No row is deleted.
- No secret value or part of one appears in the output or the report. A literal credential is reported as its location and `value withheld`; a secret typed into a sheet cell is replaced by `value withheld` and the cell is named.
- It works per use case or per vendor, so a lead can split a large sheet, and writes only the scope named. It writes nothing but the output file and never touches the input sheet, the tracker or a proposal file.
- The same inputs give a byte-identical file. Before reporting, the skill reads the file back and checks the field count per row, the quoting, the header, that human-owned columns equal the input and that no secret is present, fixes any problem and states the result.
- The skill is a GitHub Copilot agent skill (`refresh-identity-access-sheet/SKILL.md`) for our team's developers and leads, who use Copilot in VS Code agent mode and have no Craft. Nothing in the skill folder mentions Craft or needs anything installed.
- Behaviors are checked by file review and by the user's manual client-environment testing on real use cases (testing policy in the root requirements), and are marked `untested: benchmark pending`; the backlog item `prompt-skill-benchmark` covers the later benchmark.

## Must match the source

- The [Tracker Data Contract](../tracker-data-contract/README.md#purpose): columns, owner classes and the Identity & Access tab. The skill folder's contract copies are byte-identical to the contract's files. Must not: write a forbidden or computed value, or a central reference.
- The evidence, secret, identity and pointer rules of [Identity Access Discovery](../identity-access-discovery/README.md#purpose), restated in the skill because the folder is self-contained.

## Need not match

- The proposal file format, the reconciler, the review CSVs and the master workbook. The output is a sheet-shaped CSV, not a proposal; the proper route is the backlog item `adopt-manual-access-records`.
- Normalizing environment aliases (`prod`, `production`) unless the source or the developer states they are one environment.
- The authoritative tracker's SharePoint layout, any real vendor data, or direct integration with the tracker.

## Acceptance

- Given the example sheet and source, the output has one row per use case, endpoint and environment with the right `change` value, and loose or ambiguous matches never create a duplicate. (B01, B02, B03, B04)
- Human-owned and forbidden columns are byte-equal to the input in every output row, and no forbidden value is generated. (B05)
- No secret value or part of one appears in the output or the report. (B06)
- `evidence_refs` holds `source:` pointers that resolve, the output is a new CSV with the sheet's header plus `change`, nothing else is written, and a scoped run writes only that scope. (B07, B08)
- A rerun gives a byte-identical file, the self-check result is stated, and the folder has no Craft term and byte-identical copies. (B09, B10)

## Planned change: restated evidence rules and drift check

- The skill restates the evidence rules it shares with the sibling discovery skill in full for the fields it may write: the `auth_type` criteria, the per-type `proposed_access` wording, `permissions_to_confirm` listing every permission the source does not show (never guessing a permission or scope), the `unknowns` list rules including the exact text `reuse of an existing CI identity: unconfirmed`, the `NAME (runtime value unknown)` form with no value from a runtime, a log or a CI setting, and the document-only prefix on `observed_access`.
- A paired row's `proposed_access` is rewritten only when the run sets or corrects `auth_type` or when it is blank; a blank `unknowns` is filled and a non-blank one kept as typed; the developer's `permissions_to_confirm` entries are kept and the missing ones added. Either change makes the row `corrected`.
- A `not in source` row stays exactly as typed, prefix included; a paired row that gains a `source:` pointer drops the prefix only when the source shows the observed access; a `new` row has none.
- Must match the source (the sibling's meaning and fixed strings): the rules above. May differ, deliberately: no shared-flag computation, no `request_status` or `unknown_owner` suggestion, no `ready-to-raise`, `use_case_ref` filled on `new` rows, no revision in pointers.
- The review checklist holds a drift section: one row per restated rule with the sibling section it must match, the deliberate differences, and a pass rule. The skill folder does not name the sibling skill.
- Enum rule: the output's `auth_type` is only `website-sign-in`, `api-credential`, `other` or `unknown`, the allowed values being those of the schema copy. The type the source shows is written; where the source is silent and the developer's free text unambiguously names one kind (a sign-in, SSO or login page is `website-sign-in`; an API key, token or credential is `api-credential`), that kind is written; otherwise `unknown`. A row changed this way is `corrected`, and the report lists it by row and column with the developer's original wording, so nothing is lost; the output is a separate file.
- Human-owned and forbidden columns stay copied exactly as typed, but the report lists every value outside its allowed list or format (the enums `request_status` and `verification`, dates as `YYYY-MM-DD`, `expected_availability` as a date or `unknown`) by row and column, without changing it.
- Style: spec text columns follow the discovery skill's shapes and the sample workbook's concise style (`observed_operations` the method and call with setting names, `identity_reference` names only, `unknowns` a `;`-list, `evidence_refs` `source:` pointers). The skill rewrites a spec text column only under the rules above and in the planned change, and never rewrites or shortens the developer's wording on its own initiative. Where the sample and the discovery skill differ in a fixed form, the discovery skill and the schema win.
- Checks: the drift section of the review checklist gains rows for the enum rule and the shapes; at build the example CSVs, input and refreshed, are compared column by column with `tracker-tools/sample-tracker-workbook/data/identity-access.csv` and any mismatch of style or value form is fixed; row 1 of the input example gets a free-text `auth_type` that names no one kind so the refreshed row shows `unknown` and the report names the original wording.
- Must not: edit the sibling skill, the root or the contract and schema copies, or add code.
- Acceptance: a corrected `auth_type` gives a `corrected` row following the rules for that type, and the output's `auth_type` is always an allowed value (B01); a `new` row carries the rules and the CI text (B03); out-of-list human-owned and forbidden values stay as typed and are listed in the report (B05); identity form, prefix, byte-equal `not in source` rows (B06, B07); the drift section, including the enum rule and the text shapes, and self-containment (B10).
