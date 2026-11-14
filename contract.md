# Contract

## Contract

### Document pack

| File | Component | Purpose |
| --- | --- | --- |
| `job-behavior-template.md` | Job Behavior Template | The blank form for documenting one job. |
| `website-check-job-behavior-v1.md` | Website Check Job Behavior | The completed reference specification, Version 1. |
| `document-job-behavior/` (`SKILL.md`, a copy of the template, `self-check.md`) | Copilot Drafting Guide | The Copilot agent skill. |
| `usage-and-model-guidance.md` | Copilot Drafting Guide | Usage and model advice, with a valid-as-of date. |
| `drafting-prompt.md` | Copilot Drafting Guide | Fallback prompt for surfaces without skills. |

Only these files leave the Craft records. The vendor receives the finished specification; the template, skill and guidance are for our team. The documents share the same section headings and the same ID scheme (`CUR-`, `ASM-`, behavior and scenario IDs), and the template copy inside the skill folder is identical to the template. The section list is set by the template build and recorded in the [template contract](job-behavior-template/contract.md#contract).

### Shared wording rules

- Plain business language; a file name appears only in a source pointer.
- No Craft term in any pack file.
- Say "version", not "baseline".
- Acknowledgement records the vendor's review of the stated behavior at one version; it does not claim the behavior is error-free, that inferred behavior is approved, or that future issues are prevented.
