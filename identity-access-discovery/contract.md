# Contract

## Contract

### Skill input and output

| Part | Content |
| --- | --- |
| Skill name | The `name` in the `SKILL.md` front matter is `discover-identity-access`, identical to the folder name. |
| Input | Source code and configuration of a use case (the part that fits), `external_tools.md`, `logic.md` and any tagged documents, the vendor and the proposal ID. |
| Output | `tracker-updates/<proposal-id>/tracker-updates.csv` rows for the Identity & Access tab (one record per use case and endpoint and environment), and a report of unread files, use cases with no source to sweep, endpoints with no evidence and rows with no pointer. |
| Folder | `SKILL.md`, byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv` from the [Tracker Data Contract](../tracker-data-contract/README.md#purpose) component, and the example files named in the Design. |

### Handling of identities

- Identity references are names and variable references only. A literal credential found in source is reported as its location and `value withheld`.
- Existing CI identity reuse is always `unconfirmed`. Rows are per use case and endpoint. `shared_request_flag` and `shared_with` only flag identical endpoints for lead review; a lead sets `consolidated_request_ref` after confirming endpoint, environment, identity and permissions.
- Authentication-specific requests: a website sign-in asks for an approved identity or account, application permissions and a supported automated authentication or SSO where it applies; an API source asks for approved API identity or credential provisioning and the permissions or scopes the source supports, and has no blanket SSO question. A permission is never guessed.
- A row is `ready-to-raise` when endpoint, environment, authentication type, identity reference and permission are known; other unknowns stay listed with their resolver and do not block it. Coordinator, vendor action owner, ticket, raised date, expected availability and verification are never filled in by the skill (a blank availability is shown as `unknown`), and it suggests only `proposed` or `ready-to-raise` for `request_status`; a lead sets every later status.
- Approval or provisioning (`request_status`), verified working access (`verification`) and behavior acknowledgement are separate signals.

### Wording and handling rules

- No Craft file name, command or term appears in the skill folder; it needs nothing installed in VS Code agent mode.
- No secret value appears in any output.
- A value the evidence does not show is left blank or `unknown`, never guessed.
- Output is a proposal for a lead to review; it is never written into the authoritative tracker.
- An Identity & Access row is keyed `<use-case-id>/<endpoint>/<environment>`, in the `record_key`, the row order, `shared_with` and the repeat-run match. The use case ID `uc-<vendor-slug>-<use-case-slug>` is defined in the [Tracker Data Contract](../tracker-data-contract/contract.md); it is derived, never stored. The use case name is not part of the key and a key in the old name form is not valid.
- The ID needs the vendor. When it is not known, the skill asks the lead once, never invents one, and writes no keyed row for that use case until it is known.
- The skill folder's `tracker-data-contract.md` equals the Tracker Data Contract component's file as built.
