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
