# Contract

## Contract

### Skill input and output

| Part | Content |
| --- | --- |
| Skill name | The `name` in the `SKILL.md` front matter is `recommend-workflows`, identical to the folder name. |
| Input | The set of use case specifications to compare (and which are missing or draft), the current `use-case-to-workflow-decisions.md`, optionally `validation-examples.md`, optionally a manually tagged folder of earlier workflow analyses, optionally an export of the Use Cases tab (read only, for a lead's `grouping_impact_lead` override and the proposer's `grouping_impact` suggestion), and the proposal ID. |
| Output | `use-case-to-workflow-recommendations.md` (internal, regenerated), Mappings rows in the contract's long format, and a report of what was not compared. |
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
