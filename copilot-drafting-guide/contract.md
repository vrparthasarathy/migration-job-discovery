# Contract

## Contract

### Skill input and output

| Part | Content |
| --- | --- |
| Skill name | The `name` in the `SKILL.md` front matter is `document-job-behavior`, identical to the folder name. |
| Input | The job's source code (or the part that fits); optionally vendor-provided documents; the template copy in the skill folder; optionally the use case name, an existing document to update, or answers to questions. |
| Output | One filled-in document that uses only the template's parts; every statement a current behavior `B<n>` with an evidence pointer or a question `Q<n>`; a self-check report; the acknowledgement log left blank unless the developer supplies the facts. |
| Update | The same file with answered questions turned into current behaviors ("resolved: now B<n>"), a new change-log entry and a bumped version; an acknowledged row is never edited. |

### Guidance and fallback

| Part | Content |
| --- | --- |
| Usage | How to run the skill in VS Code agent mode, how to give vendor documents and answers, how to split large source, how to review the draft against the source, tagging at each acknowledgement and repository protections as outside this deliverable. |
| Model advice | Task categories and the team-reported models, marked team-reported and environment-dependent, with a valid-as-of date, a re-check step and a reminder to use the model picker. |
| Review reminder | Copilot output is a draft for human checking. |
| Fallback prompt | The same instructions as the skill, to paste into Copilot Chat on a surface without skills. |

### Planned revision

The skill, the guidance and the fallback prompt accept the core files `external_tools.md` and `logic.md`, manually tagged documents and supplied findings, questions, corrections and dependency observations as they are; separate source-observed, document-described, team-analysis and recommendation statements; check that evidence supports each claim and flag conflicts; update an answered question's own section and create a behavior only when the answer establishes one; and, after drafting or updating, tell the developer to run the companion skill `propose-tracker-updates` (see [Tracker Update Proposer](../tracker-update-proposer/README.md#purpose)). The skill's template copy is replaced by a byte-identical copy of the revised template. No Craft term is added.
