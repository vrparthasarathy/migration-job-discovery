---
name: document-job-behavior
description: Creates, drafts, updates and versions a job behavior document from a job's source code, and from vendor-provided documents when given, using the template in this folder. Use when a developer asks to document what a job does today, to write or refresh a job behavior document, to apply answers to its questions, or to record an acknowledgement from facts the developer gives.
user-invocable: true
---

# Document job behavior

You write one document per use case that records what a job does today, for a vendor to review before our team migrates the job. This is an as-is record. You describe no changes, no design for the new platform and no grouping of jobs.

Use only the parts of `job-behavior-template.md` in this folder. Keep every heading and its order. Never add a part and never remove one. Self-check rules and the question rule are in `self-check.md` in this folder; read it before you return a draft.

## Inputs

- Required: the job's source code, or the part of it the developer gives you. If the source is large, work file by file and say which files you read.
- Optional: vendor-provided documents. Treat them as evidence. They take precedence over documents our team created. Use a document our team created only for a point no vendor document covers, and say so in the evidence cell.
- Optional: the use case name, an existing document to update, answers to questions, and facts for an acknowledgement.

If the use case name is not given, ask for it once. It is the file name and the document identity. Do not invent a number or code for the job.

## Create a document

1. Copy `job-behavior-template.md` to a new file named after the use case, using the vendor's own name for it.
2. Replace every text in curly brackets. Where you do not know something, write `unknown`. Never leave a cell empty and never guess, except the Evidence cell of an `unknown` operational context row and the acknowledgement log row, which stay as the template has them.
3. Set Version to 1, Status to draft, and the change log to one first-version entry. Use the date the developer gives, otherwise `unknown`; never invent a date. Fill the source revision and script link only from facts you can see (for example the repository revision); otherwise write `unknown`.
4. Leave the acknowledgement log exactly as the template has it.

## Draft from the evidence

Every statement is exactly one of two kinds.

- A current behavior (`B1`, `B2`, ...): something the source or a vendor document shows. Write "When ... then ..." in plain business language, and give an evidence pointer: the source file and place, or the vendor document and place. File names appear only in the evidence column. Do not explain internal names in the business text. Do not add a reason, a schedule or any fact the evidence does not show. A value, an address or a setting the source states is a current behavior or a parameter, never a question.
- A question (`Q1`, `Q2`, ...): something the source cannot show. Inferred statements are either a question or left out. Never write an inferred statement as a current behavior.

### The question rule

Ask only when both are true: the source cannot show the answer, and the answer would change what the migrated workflow must do. Never ask what the source states. Never ask the reason behind a behavior the source shows (for example why a check is switched off): state the behavior and leave any review of it to our team. One question per item, each with status `open`.

### Vendor documents and the code

Where a vendor document and the code agree, cite both. Where they disagree, do not guess which is right: record a question that names both points, and do not write either as the current behavior until it is answered.

### Inputs, outputs, parameters and external dependencies

Fill the four tables from the evidence. A parameter row gives the name and this job's value as the source states it. An external system row gives its role and the direction of each call (what is asked and what comes back).

### Diagram

Draw one black box for the whole job, in the template's form: `flowchart TB` with the elk layout front matter and the loose security line exactly as in the template. Show only the job, the outside systems, the outgoing calls and the responses. Write the behavior IDs as plain text in the edge labels, for example `(B1, B2)`. In the plain-text description beside the diagram, link each ID, for example `[B1](#b1)`. No internal names (modules, classes, functions) in the diagram or the description.

### Acceptance scenarios

Write given, when, then in business language. Each scenario ends with a linked `covers:` line, for example `covers: [B1](#b1), [B2](#b2)`. Every current behavior is covered by at least one scenario. A scenario names only IDs that exist.

### Operational context

Schedule and trigger, logging, monitoring and alerts, owner and failure handling are not behaviors. Fill a row only from a vendor document or a configuration in the source, and cite it. Otherwise write `unknown`.

## Return the draft with a self-check

End every draft with the self-check report described in `self-check.md`. It lists the source and documents you did not read, current behaviors with no scenario, scenarios naming unknown IDs, and statements with no evidence pointer. State that the check is best effort and that a person must review the draft against the source. The report goes in your reply, not in the document file.

## Update the same file when the developer gives answers

Answers may come from the vendor or from our team. Edit the same file; do not make a copy.

1. For each answered question, add a new current behavior (the next free `B<n>`) in business language with an evidence pointer that names the answer and who gave it (the vendor, or our team and the date). Set the question's status to `resolved: now B<n>`. Keep the question's row.
2. Add scenarios or extend a scenario's `covers:` line so every new behavior is covered. Update the diagram labels and the plain-text description where a new behavior belongs to a drawn call.
3. Add a change-log entry for the new version: the version number, the date, what changed in plain words, and why (answered question or source change).
4. Bump the version number in the header and set the status to draft.
5. Never edit an earlier row of the acknowledgement log, and never change a version that was acknowledged: the change belongs to the new version.
6. Remind the developer to tag the repository at each acknowledgement, for example `<use-case-name>-v<n>`, so that version can be recovered.

If the source changed instead of an answer, add the behavior change the same way with the source revision and a change-log entry, and bump the version.

## Acknowledgement

You never tick, confirm or record an acknowledgement on your own. Record one only when the developer gives you the facts: company name, date acknowledged, version reviewed, script link and revision, and the tracker entry or reply reference. Fill the blank row the template ships for the first acknowledgement, and add one new row for each later one. Write exactly the facts you were given, and leave a box as `[ ]` unless the developer says the reply confirmed it. Write no person name or role. If a fact is missing, ask for it; do not fill it in. Never state that an acknowledgement means the behavior is free of errors or that future issues are prevented.
