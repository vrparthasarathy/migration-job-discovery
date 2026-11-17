# Requirements: Workflow Recommender

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The skill compares use case specifications by behavior and recommends candidates for one reusable workflow with shared behaviors, parameter differences, exceptions and the specification versions used. A shared external system alone never makes a candidate. It keeps no persistent per-use-case profile; a normalized summary is a temporary cache. It compares the full set, which is every row of the `use-case-index.csv` at the repository root (each specification read from the row's `spec` path; a missing or blank spec is reported as `missing`), and shows shared steps and differences. The proposal ID is the fixed value `recommendations` and is never asked for. The full list is confirmed once with a warning that a partial list drops the other use cases' Mappings rows, unless the caller already confirmed it. Earlier workflow analyses that a lead tags (a folder of about four or five files; paths and counts unknown) supply starting candidates only: they are not verified or approved baselines, never mandatory workflow choices and never vendor acceptance, and no exhaustive reconciliation of them is required.
- It exposes what it did not compare (missing, unread or unversioned specifications) and the unknowns that could change a mapping, linking existing specification questions and reporting a missing question as a specification gap. Only grouping-relevant unknowns block a mapping. Draft specifications may generate recommendations before any vendor acknowledgement.
- It never claims the method is proven: it says not validated unless the supplied validation examples (known same and different pairs) were compared, and reports the agreement.
- Leads own the decisions file. The skill reads it, never edits it, shows decision status, and assesses the grouping impact of a change separately from whether behavior changed, suggesting re-review with a short reason when the impact could affect grouping or is unknown (never silently none, and not for any version bump or spelling edit), using a lead's override from an optional, read-only Use Cases export when one is supplied and never overturning a decision; a rejected pairing is proposed again only with new evidence.
- Before reporting, the skill checks its proposal file: exactly 12 fields per row; quoting of any value with a comma, a double quote or a line break; the exact header; `created_on` and any date value as `YYYY-MM-DD`; the key form of its tab; one final line feed. When appending to the shared file it first makes sure the file ends with a line feed. An empty `base_value` stays blank. When the toolkit is available it also runs `validate <file>` of the Tracker Reconciler and fixes every error before reporting; the skill needs nothing installed.
- The recommendations and decisions are internal and cross-vendor comparisons stay internal; each vendor confirms only its own scope.
- The skill is a GitHub Copilot agent skill (`recommend-workflows/SKILL.md`) for our team's developers and leads, who use Copilot in VS Code agent mode and have no Craft. Nothing in the skill folder mentions Craft or needs anything installed.
- Output is a proposal that stays outside the authoritative tracker until a lead has reviewed it. No secret value appears in any output.
- Behaviors are checked by file review and by the user's manual client-environment testing on real use cases (testing policy in the root requirements), and are marked `untested: benchmark pending`; the backlog item `prompt-skill-benchmark` covers the later benchmark.

## Must match the source

- The [Tracker Data Contract](../tracker-data-contract/README.md#purpose): columns, owner classes, references, statuses and proposal format. The skill folder's contract copies are byte-identical to the contract's files. The five index column names equal the Discovery Orchestrator's contract.
- Key rules: Mappings rows are keyed `<use-case-id>->>candidate-slug` and blocking questions linked as `<use-case-id>/Q<n>@v<version>`, with the use case ID `uc-<vendor-slug>-<use-case-slug>` derived from the index row's vendor and name; with no vendor known the skill asks once, invents none and writes no Mappings row for that use case.
- Must not: write or repair the index, or change the Tracker Data Contract or its copies.

## Need not match

- The authoritative tracker's SharePoint layout, any real vendor data, or direct integration with the tracker.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Output varies.** Copilot output differs between models and runs; the behaviors can be judged only on samples.
- **Copies must stay in step.** The contract and schema copies in the skill folder must match the contract component's files; the root checks them.
