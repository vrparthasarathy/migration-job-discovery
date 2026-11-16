# Contract

## Contract

### Skill input and output

| Part | Content |
| --- | --- |
| Skill name | The `name` in the `SKILL.md` front matter is `document-job-behavior`, identical to the folder name. |
| Input | The use case's source code (or the part that fits); the core files `external_tools.md` and `logic.md` (exact filenames; a missing one is reported, never invented); optionally additional documents tagged by the developer as vendor document, original SOP document or team analysis; optionally findings, questions, corrections and dependency observations, accepted as they are; the template copy in the skill folder; optionally the use case name, an existing document to update, or answers to questions. |
| Output | One filled-in document that uses only the template's parts; every statement a current behavior `B<n>` with an evidence pointer or a question `Q<n>`, where only source-observed and document-described statements are current behaviors; a self-check report; the acknowledgement log left blank unless the developer supplies the facts; a pointer to run `propose-tracker-updates` next. |
| Update | The same file, repeatable: IDs and history kept, no duplicate, each answer, correction or further finding put in the section it belongs to, a new current behavior ("resolved: now B<n>") only when the answer establishes one, a new change-log entry and a bumped version; an acknowledged row is never edited. |
| Evidence kinds | Source-observed and document-described (current behaviors); team analysis or inference (a question or left out; an existing analysis is a starting input, not verified); recommendation (left out). The cited evidence must support the statement, and a conflict is flagged as a question, never guessed. |
| Self-check report | Four lists, in this order: source, core files and documents not read or missing; current behaviors with no scenario; scenarios naming unknown IDs; statements with no evidence pointer, unsupported by their evidence or in conflict. Then the best-effort statement. |

### Guidance and fallback

| Part | Content |
| --- | --- |
| Usage | How to run the skill in VS Code agent mode, how to give the core files, tagged documents, supplied findings and answers as they are, how to split large source, how to review the draft against the source, to run `propose-tracker-updates` after drafting or updating, that acknowledgement facts reach the developer from the lead, tagging at each acknowledgement and repository protections as outside this deliverable. |
| Model advice | Task categories and the team-reported models, marked team-reported and environment-dependent, with a valid-as-of date, a re-check step and a reminder to use the model picker. |
| Review reminder | Copilot output is a draft for human checking. |
| Fallback prompt | The same instructions as the skill, to paste into Copilot Chat on a surface without skills. |

### Revision (use case wording)

The skill, the guidance and the fallback prompt use `use case` for the business unit and `script` only for the vendor's code, accept the inputs above as they are, and contain no Craft term. The skill folder name and the skill `name` stay `document-job-behavior`. The skill's template copy is a byte-identical copy of the revised template. The companion skill is `propose-tracker-updates` (see [Tracker Update Proposer](../tracker-update-proposer/README.md#purpose)); this skill tells the developer to run it and does not run it.
