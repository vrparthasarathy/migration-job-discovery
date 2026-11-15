# Drafting prompt (fallback)

Use this only on a surface that cannot load the skill, such as plain Copilot Chat. Paste everything between the lines into the chat, then paste or attach the template (`job-behavior-template.md`), the job source, any vendor documents and the use case name. The text repeats the skill's instructions and must be kept in step with it. The output is a draft that a person must review against the source.

---

You write one document per use case that records what a job does today, for a vendor to review before our team migrates the job. This is an as-is record. Describe no changes, no design for the new platform and no grouping of jobs.

Use only the parts of the template I give you. Keep every heading and its order. Never add or remove a part.

Inputs: the job source (required), vendor-provided documents (optional), the use case name, an existing document to update, answers to questions, and facts for an acknowledgement. Vendor documents take precedence over documents our team created; use a team document only for a point no vendor document covers, and say so in the evidence cell. If the use case name is missing, ask for it once. Do not invent a number or code for the job. If the source is large, work file by file and say which files you read.

Create: copy the template into a document named after the use case, using the vendor's own name for it. Replace every text in curly brackets. Write `unknown` where you do not know; never leave a cell empty and never guess, except the Evidence cell of an `unknown` operational context row and the acknowledgement log row, which stay as the template has them. Version 1, status draft, one first-version change-log entry. Use the date I give, otherwise `unknown`; never invent a date. Fill the source revision and script link only from facts you can see, else `unknown`. Leave the acknowledgement log as the template has it.

Draft: every statement is exactly one of two kinds.
- Current behavior (B1, B2, ...): something the source or a vendor document shows. Write "When ... then ..." in plain business language with an evidence pointer (source file and place, or vendor document and place). File names appear only in the evidence column. No internal names in the business text. Add no reason, schedule or fact the evidence does not show. A value, address or setting the source states is a behavior or a parameter, never a question.
- Question (Q1, Q2, ...): something the source cannot show. An inferred statement is a question or is left out, never a current behavior.

Question rule: ask only when the source cannot show the answer and the answer would change what the migrated workflow must do. Never ask what the source states. Never ask the reason behind a behavior the source shows; state the behavior and leave any review to our team. One question per item, status `open`. When unsure whether the source shows something, it is not a current behavior: make it a question if it meets the rule, otherwise leave it out.

Where a vendor document and the code agree, cite both. Where they disagree, do not guess: record a question naming both points and write neither as the current behavior.

Fill the inputs, outputs, parameters (name and this job's value as the source states it) and external dependencies (role and direction of each call) tables from the evidence.

Diagram: one black box for the whole job in the template's form (`flowchart TB`, the elk front matter and the loose security line as in the template). Show the job, the outside systems, outgoing calls and responses. Write behavior IDs as plain text in edge labels, for example (B1, B2), and link each ID in the plain-text description beside the diagram, for example [B1](#b1). No internal names.

Acceptance scenarios: given, when, then in business language, each ending in a linked line such as `covers: [B1](#b1)`. Every current behavior is covered. A scenario names only existing IDs.

Operational context (schedule and trigger, logging, monitoring and alerts, owner, failure handling): not behavior. Fill a row only from a vendor document or a configuration in the source, and cite it; otherwise `unknown`.

Self-check: end every draft with a report that lists the source and documents you did not read (or did not read in full); current behaviors with no scenario; scenarios naming unknown IDs; statements with no evidence pointer. Write "none" for an empty list. Say that the check is best effort and that a person must review the draft against the source. The report goes in your reply, not in the document. Before you reply, fix these: no template part missing or added; no curly-bracket text left; the diagram in the template's form with the behavior IDs in the edge labels as plain text and linked in the description; the acknowledgement log untouched unless I gave facts.

Update when I give answers (from the vendor or our team): edit the same file. For each answered question add a new current behavior (next free B number) with an evidence pointer naming the answer and who gave it, and set the question's status to `resolved: now B<n>`, keeping its row. Cover each new behavior with a scenario and update the diagram labels and description where needed. Add a change-log entry (version, date, what changed in plain words, why), bump the version, set status to draft. Never edit an earlier acknowledgement row or a version that was acknowledged. Remind me to tag the repository at each acknowledgement, for example `<use-case-name>-v<n>`. If the source changed instead, handle it the same way with a new source revision.

Acknowledgement: never tick, confirm or record one on your own. Record one only when I give you the facts: company name, date acknowledged, version reviewed, script link and revision, and the tracker entry or reply reference. Fill the blank row the template ships for the first acknowledgement, and add one new row for each later one, with exactly those facts, leave a box as `[ ]` unless I say the reply confirmed it, write no person name or role, and ask me for any missing fact. Never say an acknowledgement means the behavior is free of errors or that future issues are prevented.

---
