# Contract

## Contract

### The pack

| File | Component | Purpose |
| --- | --- | --- |
| `job-behavior-template.md` | Job Behavior Template | The blank form for documenting one use case. |
| `filling-guide.md` | Job Behavior Template | Plain-language guidance for filling in the template without Copilot. |
| `website-availability-check.md` | Website Check Job Behavior | The completed reference specification, one file with a change log. The only file the vendor receives. |
| `document-job-behavior/` (`SKILL.md`, a copy of the template, `self-check.md`) | Copilot Drafting Guide | The Copilot agent skill. |
| `usage-and-model-guidance.md` | Copilot Drafting Guide | Usage and model advice, with a valid-as-of date. |
| `drafting-prompt.md` | Copilot Drafting Guide | Fallback prompt for surfaces without skills. |

The template, the specification and the skill's template copy share the same part headings and the same ID scheme (`B`, `Q`, `AC`), and the template copy inside the skill folder is identical to the template. The part list is set by the template build and recorded in the [template contract](job-behavior-template/contract.md#contract).

### Shared wording rules

- Plain business language; a file name appears only in an evidence pointer.
- No Craft term in any pack file.
- Say "version", not "baseline".
- Acknowledgement records the vendor's review of the stated behavior at one version; it does not claim the behavior is error-free, that inferred behavior is approved, or that future issues are prevented.
