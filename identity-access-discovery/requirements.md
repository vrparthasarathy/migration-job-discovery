# Requirements: Identity Access Discovery

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The skill reads source, configuration, `external_tools.md`, `logic.md` and tagged documents and lists, per use case and endpoint, the external service and environment, the observed operations, the exact identity or variable references, the unknowns with who resolves them and the evidence, with runtime values `unknown`. It runs as an early lightweight sweep across all known use cases, in parallel with source screening and before specifications are drafted and with detailed behavior discovery, and needs no specification and does not wait for an acknowledgement. Supporting documents allow preliminary findings that are marked as resting on a document, never as source-verified. Repeat runs refresh the same rows.
- Requests match the observed authentication: a website sign-in asks for an approved identity or account, application permissions and a supported automated authentication or SSO where it applies; an API source asks for approved API identity or credential provisioning and the permissions or scopes the source supports, with no blanket SSO question. It never guesses a permission and stores no secret; only secure references or provisioning are named.
- It never writes a secret, never invents a request, approval, ticket or availability fact, and never marks access verified; the developer or platform team verifies access.
- Existing CI identity reuse is `unconfirmed`. Rows are kept per use case and endpoint; identical endpoints are only flagged as a possible shared request, and a lead may consolidate after confirming endpoint, environment, identity and permissions, keeping per-use-case traceability. A request with its endpoint, environment, authentication type, identity reference and permission known is `ready-to-raise` so a lead or coordinator can raise it promptly while other unknowns are resolved. Approval or provisioning is separate from verified working access and from behavior acknowledgement.
- The skill is a GitHub Copilot agent skill (`discover-identity-access/SKILL.md`) for our team's developers and leads, who use Copilot in VS Code agent mode and have no Craft. Nothing in the skill folder mentions Craft or needs anything installed.
- Output is a proposal that stays outside the authoritative tracker until a lead has reviewed it. No secret value appears in any output.
- Behaviors are checked by file review and by the user's manual client-environment testing on real use cases (testing policy in the root requirements), and are marked `untested: benchmark pending`; the backlog item `prompt-skill-benchmark` covers the later benchmark.

## Must match the source

- The [Tracker Data Contract](../tracker-data-contract/README.md#purpose): columns, owner classes, references, statuses and proposal format. The skill folder's contract copies are byte-identical to the contract's files.

## Need not match

- Broader network connectivity, environment setup and router availability: an open, deferred scope pending the developer sample sheet, not authorized here.
- The authoritative tracker's SharePoint layout, any real vendor data, or direct integration with the tracker.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Output varies.** Copilot output differs between models and runs; the behaviors can be judged only on samples.
- **Copies must stay in step.** The contract and schema copies in the skill folder must match the contract component's files; the root checks them.
