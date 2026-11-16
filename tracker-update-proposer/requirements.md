# Requirements: Tracker Update Proposer

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The skill turns one use case specification into proposed rows for the Use Cases and Questions tabs (no link or group rows; similarity checking is the reconciler's): a first `add` for a new use case, one `add` per use case per open question with its exact text and a source anchor with version, a `set` of the current version on update with a behavior-change or non-behavior-change class and, separately, a suggested grouping impact (could-affect, not-expected or unknown) with a short reason, and a `suggest` for a question the new version incorporates. In source-screening mode, run first over the whole inventory and its source locations before any specification exists, it suggests source status, blocker, note and owner (or `unassigned`) for use cases whose script is missing, empty or of uncertain mapping, from inventory or source-screening evidence and with no specification anchor; it never marks a source confirmed unavailable and treats supporting documents as preliminary support only.
- Every row is keyed by the use case ID `uc-<vendor-slug>-<use-case-slug>` (a Questions row `<use-case-id>/Q<n>`, `spec_refs` `<use-case-id>/Q<n>@v<version>`); the name or slug alone is not a key, and the specification's location comes from the use case index, not from the slug. With no vendor known the skill asks the lead once, invents none and writes no keyed row for that use case.
- It supports first generation and repeatable updates: the same specification gives the same rows, a revised specification updates existing records without duplicates, and local references are never renumbered.
- Every row traces to a specification anchor and version. Supplied findings, questions and corrections reach the tracker through the specification that records them (the drafting skill structures them); the skill lists any supplied item not yet in a specification and never guesses.
- It never writes a central reference, a release date, a batch, an answer, an acknowledgement, a ticket or a decision, and never rewrites released question text. A reworded released question keeps its identity: the new wording is recorded beside it with a wording-edit or possible-meaning-change flag, an earlier answer is kept, and a lead decides any replacement. It never withdraws or replaces a released row on its own.
- Repeating the run on an unchanged specification gives identical rows. Proposals are never released or applied automatically.
- The skill is a GitHub Copilot agent skill (`propose-tracker-updates/SKILL.md`) for our team's developers and leads, who use Copilot in VS Code agent mode and have no Craft. Nothing in the skill folder mentions Craft or needs anything installed.
- Output is a proposal that stays outside the authoritative tracker until a lead has reviewed it. No secret value appears in any output.
- Behaviors are checked by file review and by the user's manual client-environment testing on real use cases (testing policy in the root requirements), and are marked `untested: benchmark pending`; the backlog item `prompt-skill-benchmark` covers the later benchmark.

## Must match the source

- The [Tracker Data Contract](../tracker-data-contract/README.md#purpose): columns, owner classes, references, statuses and proposal format. The skill folder's copy of the contract prose equals the built file and its schema copy is byte-identical. The skill must not invent a vendor, keep a name-only or slug-only key, or migrate old references.

## Need not match

- The authoritative tracker's SharePoint layout, any real vendor data, or direct integration with the tracker.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Output varies.** Copilot output differs between models and runs; the behaviors can be judged only on samples.
- **Copies must stay in step.** The contract and schema copies in the skill folder must match the contract component's files; the root checks them.
