# Use case to workflow decisions

Internal. Not for vendors. Owned by the leads. Copy this template to `use-case-to-workflow-decisions.md` in the internal area of the specifications repository, and keep the real file out of any place a vendor can read.

The recommend-workflows skill reads this file and never edits it. Only a lead adds a row.

## Rules

- Append only. Never edit or delete an earlier row.
- One row per decision. A changed decision is a new row with its own decision ID, and the `Refers to` column holds the earlier decision ID. The current decision for a candidate is the last row of its chain.
- `Decision` is `WD-###`, assigned by the lead; the next number follows the highest one in the file.
- `Status` is `accepted`, `rejected` or `pending-clarification`.
- `Candidate` is the workflow candidate name, as the recommendations file names it.
- `Affected use cases` are use case names, exactly as the specifications write them, separated by `;`.
- `Evidence and versions` lists the specification versions and the behavior IDs considered, for example `<use case name>@v2 (B1, B2, B4)`. The skill compares these versions with the current ones to see whether a decided mapping needs another look.
- `Blocking questions` lists the tracker question references that block a `pending-clarification` decision, separated by `;`. Leave it blank otherwise.
- `Date` is `YYYY-MM-DD`. `Decided by` is a name.
- No secret value in any column.

## Decisions

| Decision | Status | Candidate | Affected use cases | Rationale | Evidence and versions | Blocking questions | Date | Decided by | Refers to |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Illustration

Invented names, not real data. Do not copy these rows into the table.

| Decision | Status | Candidate | Affected use cases | Rationale | Evidence and versions | Blocking questions | Date | Decided by | Refers to |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WD-001 | pending-clarification | Example candidate | Example Use Case A; Example Use Case B | Same steps; waiting for the answer on the retry rule. | Example Use Case A@v1 (B1, B2); Example Use Case B@v1 (B1, B3) | QN-0001 | 2026-01-01 | Example Lead |  |
| WD-002 | accepted | Example candidate | Example Use Case A; Example Use Case B | The retry rule is the same in both. | Example Use Case A@v2 (B1, B2); Example Use Case B@v1 (B1, B3) |  | 2026-01-08 | Example Lead | WD-001 |
