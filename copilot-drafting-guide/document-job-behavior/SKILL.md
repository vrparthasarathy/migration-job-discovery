---
name: document-job-behavior
description: Creates, drafts, updates and versions a use case behavior document from the use case's source code, the core files external_tools.md and logic.md, tagged additional documents and any findings, questions, corrections and dependency observations the developer supplies, using the template in this folder. Use when a developer asks to document what a use case does today, to write or refresh a use case behavior document, to apply answers, corrections or further findings to it, or to record an acknowledgement from facts the developer gives.
user-invocable: true
---

# Document job behavior

You write one document per use case that records what the use case does today, for a vendor to review before our team migrates it. This is an as-is record. You describe no changes and no design for the new platform. A use case is what the business needs done and carries the vendor's own name; the vendor's script is how it is done today. Say "use case" for the first and "script" only for the vendor's code.

Use only the parts of `job-behavior-template.md` in this folder. Keep every heading and its order. Never add a part and never remove one. The self-check rules and the question rule are in `self-check.md` in this folder; read it before you return a draft.

## Inputs

Accept every input as the developer gives it. The developer does not first rewrite findings, questions or notes into a specification: you structure and verify them.

- Required: the use case's source code, or the part of it the developer gives you. If the source is large, work file by file and say which files you read.
- Core files: `external_tools.md` and `logic.md`, with exactly those names, normally beside the source. Read both. If one is missing, say so in the self-check report. Never invent its content.
- Additional documents, tagged by the developer: vendor documents, original SOP documents, and team analysis (documents our team wrote). If a document has no tag, treat it as team analysis and say so in your reply. If the developer gives no tag and it matters, ask once.
- Supplied findings, questions, corrections and dependency observations, in whatever form the developer gives them (a list, notes, a chat message). Accept them as they are.
- Optional: the use case name, an existing document to update, answers to questions, and facts for an acknowledgement.

If the use case name is not given, ask for it once. It is the file name and the document identity. Do not invent a number or code for the use case.

## Create a document

1. Copy `job-behavior-template.md` to a new file named after the use case, using the vendor's own name for it.
2. Replace every text in curly brackets. Where you do not know something, write `unknown`. Never leave a cell empty and never guess, except the Evidence cell of an `unknown` operational context row and the acknowledgement log row, which stay as the template has them.
3. Set Version to 1, Status to draft, and the change log to one first-version entry. Use the date the developer gives, otherwise `unknown`; never invent a date. Fill the source revision and script link only from facts you can see (for example the repository revision); otherwise write `unknown`.
4. Leave the acknowledgement log exactly as the template has it.

## Draft from the evidence

### The four kinds of evidence

Every input is exactly one of these. Keep them apart.

1. Source-observed: something you can see in the source or in `external_tools.md` or `logic.md` as they describe the source. A current behavior.
2. Document-described: something a vendor document or an original SOP document states. A current behavior, and the evidence names the document and place so the reader can tell it was described and not seen in the source.
3. Team analysis or inference: something our team concluded, guessed or wrote in its own analysis, or that you infer. Never a current behavior. It is a question, if it meets the question rule, or it is left out. An existing team analysis is a starting input that tells you where to look and what to ask; it is not verified or approved.
4. Recommendation: a wish or idea for a change. Never a current behavior and never a question. Leave it out and say in your reply that you did.

### Statements

Every statement in the document is exactly one of two kinds.

- A current behavior (`B1`, `B2`, ...): something of the first or second kind. Write "When ... then ..." in plain business language and give an evidence pointer: the source file and place, or the document and place. File names appear only in the evidence column. Do not explain internal names in the business text. Do not add a reason, a schedule or any fact the evidence does not show, and state only the outcome the evidence proves. A value, an address or a setting the source states is a current behavior or a parameter, never a question.
- A question (`Q1`, `Q2`, ...): something the source cannot show. Inferred statements are either a question or left out. Never write an inferred statement as a current behavior.

### Supplied findings, questions, corrections and dependency observations

Check each one against the source and the documents, then place it where it belongs.

- A finding the source or a vendor or original SOP document shows becomes a current behavior (or a parameter, input, output or dependency), with the evidence pointer to that source or document. The finding itself is not the evidence. A finding that is team analysis, inference or a recommendation follows the rules of its kind above.
- A supplied question is added as a question in the developer's own words when it meets the question rule. If the source already shows the answer, do not ask it: state the behavior and tell the developer.
- A supplied correction changes the statement it corrects, after you check it against the evidence. If the evidence does not support it, keep the statement and record a question.
- A dependency observation goes in the external dependencies table, and in the diagram and a current behavior when the evidence shows the call.

### Vendor documents, team documents and the code

Vendor documents and original SOP documents take precedence over documents our team created. Use a team document only for a point no vendor document covers, and say so in the evidence cell. A team document alone never makes a current behavior: the point needs source or vendor evidence, otherwise it is a question or left out.

Where a document and the code agree, cite both. Where they disagree, or where any two pieces of evidence conflict (two documents, a supplied finding and the source), do not guess which is right: record a question that names both points, and do not write either as the current behavior until it is answered.

### Check that the evidence supports the claim

Before you return, read each pointer again. Confirm that the cited place shows what the statement says, no more. A pointer that names a file and place but does not show the statement is not support. Fix the statement to what the evidence shows, or move it to a question, or leave it out. List what is still unsupported or in conflict in the self-check report.

### Inputs, outputs, parameters and external dependencies

Fill the four tables from the evidence. A parameter row gives the name and this use case's value as the source states it. An external system row gives its role and the direction of each call (what is asked and what comes back).

### Diagram

Draw one black box for the whole use case, in the template's form: `flowchart TB` with the elk layout front matter and the loose security line exactly as in the template. Show only the use case, the outside systems, the outgoing calls and the responses. Write the behavior IDs as plain text in the edge labels, for example `(B1, B2)`. In the plain-text description beside the diagram, link each ID, for example `[B1](#b1)`. No internal names (modules, classes, functions) in the diagram or the description.

### Acceptance scenarios

Write given, when, then in business language. Each scenario ends with a linked `covers:` line, for example `covers: [B1](#b1), [B2](#b2)`. Every current behavior is covered by at least one scenario. A scenario names only IDs that exist.

### Operational context

Schedule and trigger, logging, monitoring and alerts, owner and failure handling are not behaviors. Fill a row only from a vendor document or a configuration in the source, and cite it. Otherwise write `unknown`.

## Return the draft with a self-check

End every draft with the self-check report described in `self-check.md`. It lists the source, core files and documents you did not read or that are missing; current behaviors with no scenario; scenarios naming unknown IDs; and statements with no evidence pointer, with evidence that does not support them, or in conflict. State that the check is best effort and that a person must review the draft against the source. The report goes in your reply, not in the document file.

Then tell the developer to run the companion skill `propose-tracker-updates` next. It proposes the tracker rows from this document. You do not run it and you write no tracker rows. Supplied findings reach the tracker only through this document.

## Update the same file

Answers (from the vendor or our team), corrections and further findings can all arrive after a draft. Edit the same file; do not make a copy. Running the same update twice must leave the file as it was after the first.

1. Keep every existing ID and every row. Never renumber, reuse or delete an ID. New behaviors take the next free `B<n>`, new questions the next free `Q<n>`, new scenarios the next free `AC<n>`.
2. Make no duplicate. Before you add anything, look for a behavior, question or table row that already says it, and extend or correct that row instead. If an answer repeats something already recorded, add nothing and say so.
3. Put each answer in the section it belongs to: a parameter, an input or output, an external dependency, an operational context row, or a current behavior.
4. Add a new current behavior (the next free `B<n>`) only when the answer establishes one, in business language with an evidence pointer that names the answer and who gave it (the vendor, or our team and the date). Then set the question's status to `resolved: now B<n>`. When the answer updated another section instead, set the status to `resolved: see <that section>`. Keep the question's row.
5. Add scenarios or extend a scenario's `covers:` line so every new behavior is covered. Update the diagram labels and the plain-text description where a new behavior belongs to a drawn call.
6. Check the new content against its evidence as in the draft, and flag a conflict with an existing statement as a question.
7. Add a change-log entry for the new version: the version number, the date, what changed in plain words, and why (answered question, correction, further finding or source change).
8. Bump the version number in the header and set the status to draft.
9. Never edit an earlier row of the acknowledgement log, and never change a version that was acknowledged: the change belongs to the new version.
10. Remind the developer to tag the repository at each acknowledgement, for example `<use-case-name>-v<n>`, so that version can be recovered.
11. End with the self-check report and tell the developer to run `propose-tracker-updates` next.

If the source changed instead of an answer, add the behavior change the same way with the source revision and a change-log entry, and bump the version.

## Acknowledgement

You never tick, confirm or record an acknowledgement on your own. Record one only when the developer gives you the facts: company name, date acknowledged, version reviewed, script link and revision, and the tracker entry or reply reference. Fill the blank row the template ships for the first acknowledgement, and add one new row for each later one. Write exactly the facts you were given, and leave a box as `[ ]` unless the developer says the reply confirmed it. Write no person name or role. If a fact is missing, ask for it; do not fill it in. Never state that an acknowledgement means the behavior is free of errors or that future issues are prevented.
