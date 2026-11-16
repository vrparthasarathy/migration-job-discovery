# Contract

## Contract

### Skill input and output

| Part | Content |
| --- | --- |
| Skill name | The `name` in the `SKILL.md` front matter is `propose-tracker-updates`, identical to the folder name. |
| Input | One use case specification (and the previous version when updating), the use case's vendor and the proposal ID; for source-screening mode, the inventory list and the source locations, with no specification. |
| Output | `tracker-updates/<proposal-id>/tracker-updates.csv` rows for the Use Cases and Questions tabs in the contract's long format (one Questions row per use case per question), and a report of content with no row, supplied items not yet in a specification, rows without a source, unread files and use cases whose behavior changed. |
| Folder | `SKILL.md`, byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv` from the [Tracker Data Contract](../tracker-data-contract/README.md#purpose) component, and the example files named in the Design. |

### Update rules

- The skill writes human-owned columns only as `suggest` on an existing record or as an initial suggestion on an `add`, and writes no Question Links or Question Groups rows.
- Local references are never renumbered; rerunning on the same input gives the same `update_id` values and no duplicate record.
- A reworded released question keeps its row. The new wording goes to `current_spec_text` and `text_review` is `wording-edit` or `possible-meaning-change`. `question_text`, the answer and the vendor's answer status are never touched, and a lead decides any replacement.
- A specification change is classed `behavior-change` when behaviors, parameters, dependencies or scenarios changed and `non-behavior-change` otherwise (version, date, spelling, change log, acknowledgement), with the changed behavior IDs as the reason.
- Separately, `grouping_impact` is `could-affect`, `not-expected` or `unknown` with a short reason carried in the proposal row's `reason` field. A behavior change does not necessarily affect grouping. A lead may override it, and `unknown` is never treated as no impact.
- Source screening runs over the whole inventory and its source locations before any specification exists and uses `inventory:<row>` or `source-screen:<path>` as the source, with no specification anchor. It suggests `not-located`, `empty` or `uncertain-mapping`, a blocker reason and a note, and an owner only when the inventory names one, otherwise `unassigned`. A source is never marked `confirmed-unavailable` by the skill. Supporting documents are listed as preliminary support and never as source verification.

### Wording and handling rules

- No Craft file name, command or term appears in the skill folder; it needs nothing installed in VS Code agent mode.
- No secret value appears in any output.
- A value the evidence does not show is left blank or `unknown`, never guessed.
- Output is a proposal for a lead to review; it is never written into the authoritative tracker.

### Planned: use case ID keys

Planned, not built; merged into the update rules above when built. The use case ID `uc-<vendor-slug>-<use-case-slug>` is defined in the [Tracker Data Contract](../tracker-data-contract/contract.md#planned-use-case-id-and-local-references).

- A Use Cases row is keyed by the use case ID. A Questions row is keyed `<use-case-id>/Q<n>` and its `spec_refs` entry is `<use-case-id>/Q<n>@v<version>`. The use case name stays in the `use_case_name` column. The name or the slug alone is not a key. The slug is the use case name in lower case with hyphens, and the specification's location comes from the use case index, not from the slug.
- The ID needs the vendor. When it is not shown by the inventory, the input or the specification, the skill asks the lead once, never invents one, and writes no keyed row for that use case until it is known.
- The skill folder's `tracker-data-contract.md` equals the Tracker Data Contract component's file as built.
