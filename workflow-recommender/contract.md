# Contract

## Contract

### Skill input and output

| Part | Content |
| --- | --- |
| Skill name | The `name` in the `SKILL.md` front matter is `recommend-workflows`, identical to the folder name. |
| Input | `use-case-index.csv` at the repository root (read only), the use case specifications it lists, each read from its `spec` path (and which are missing or draft), the current `use-case-to-workflow-decisions.md`, optionally `validation-examples.md`, optionally a manually tagged folder of earlier workflow analyses, optionally an export of the Use Cases tab (read only, for a lead's `grouping_impact_lead` override and the proposer's `grouping_impact` suggestion), and the fixed proposal ID `recommendations`, never asked for. |
| Output | `use-case-to-workflow-recommendations.md` (internal, regenerated), Mappings rows in the contract's long format in `tracker-updates/recommendations/tracker-updates.csv`, and a report of what was not compared. |
| Folder | `SKILL.md`, byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv` from the [Tracker Data Contract](../tracker-data-contract/README.md#purpose) component, and the example files named in the Design. |

### Decisions file (`use-case-to-workflow-decisions.md`), owned by leads

Append-only; one row per decision; a changed decision is a new row that refers to the earlier one. The skill reads it and never edits it.

| Column | Content |
| --- | --- |
| Decision | `WD-###`, assigned by the lead |
| Status | accepted, rejected or pending-clarification |
| Candidate | the workflow candidate name |
| Affected use cases | use case names |
| Rationale | why the lead decided this |
| Evidence and versions | specification versions and behavior IDs considered |
| Blocking questions | tracker question references that block a pending-clarification decision |
| Date | `YYYY-MM-DD` |
| Decided by | a name |
| Refers to | an earlier decision ID, when this row changes it |

### Recommendations file (`use-case-to-workflow-recommendations.md`), generated

Per candidate: member use cases, shared behaviors by ID, parameter differences, exceptions and differences, specification versions and revisions used, the decision status read from the decisions file, blocking unknowns with linked question references, and a re-review suggestion with its reason when a decided mapping's versions changed. Each member is marked as resting on a specification, an earlier analysis or both. A decided mapping is flagged for re-review when the change could affect grouping or its impact is unknown, with a short reason and the changed behavior IDs; a lead's override of the impact is respected, unknown is never treated as no impact, and a behavior change with no grouping impact, a version bump or a wording edit alone is not flagged. It ends with a `not compared` list and the date and set it covered, and names the earlier analyses it read. It is marked internal and states that the method is not validated.

### Validation examples (`validation-examples.md`), supplied by leads

A list of use case pairs the leads already know to be the same or different, with a short reason. The skill compares its output with them and reports the agreement; without the file it says the method is not validated.

### Wording and handling rules

- No Craft file name, command or term appears in the skill folder; it needs nothing installed in VS Code agent mode.
- No secret value appears in any output.
- A value the evidence does not show is left blank or `unknown`, never guessed.
- Output is a proposal for a lead to review; it is never written into the authoritative tracker.

### Use case index and fixed proposal ID

- **Index.** `use-case-index.csv` at the repository root, written only by the [Discovery Orchestrator](../discovery-orchestrator/contract.md#use-case-index-derived-proposal-id-and-fixed-recommendations-id) and read here without change. Columns, exactly `use_case_name,slug,vendor,folder,spec` (restated from that contract; they must stay equal). `folder` and `spec` are paths relative to the repository root.
- **List.** Every index row is a use case to compare; each specification is read from its `spec` path. A blank `spec`, or a path that is not a file, lists the use case under `not compared` as `missing`. A use case in the index is never dropped. If the index is absent the skill stops and says to run `run-discovery` first.
- **Proposal ID.** The fixed value `recommendations`; the skill never asks for it. Output: `tracker-updates/recommendations/tracker-updates.csv`, only its Mappings rows rewritten. A Mappings `source` uses the row's `spec` path.
- **Confirmation.** The full list is shown once with the warning that the file is regenerated and a partial list drops the other use cases' Mappings rows, unless the caller has already confirmed the list this session.

### Use case ID keys

The use case ID `uc-<vendor-slug>-<use-case-slug>` is defined in the [Tracker Data Contract](../tracker-data-contract/contract.md#references) and is derived here from the index row's `vendor` and `use_case_name`, never stored.

- A Mappings row is keyed `<use-case-id>->>candidate-slug`, where the candidate slug is the candidate name in lower case with hyphens. A blocking question is linked by its local reference `<use-case-id>/Q<n>@v<version>`. The name form and the slug-alone form are not valid.
- The ID needs the vendor. For an index row with a blank vendor the skill asks the lead once, never invents one, and writes no Mappings row for that use case until it is known; the use case is still compared and listed in the report.
- The skill folder's `tracker-data-contract.md` equals the Tracker Data Contract component's file as built; `tracker-schema.csv` is unchanged.
