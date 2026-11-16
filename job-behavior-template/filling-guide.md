# Filling Guide

How to fill in the template for one vendor use case. You need only a text editor or GitHub Copilot. The finished document is read by a business reviewer, so use short, plain sentences and explain any technical term the first time you use it. Say "use case" for what the business needs done and "script" only for the vendor's own code.

## Where to type

1. Copy the template and name the copy after the use case, using the vendor's own name for it. Never rename it.
2. Replace every text in curly brackets with your own words. Keep every heading.
3. Where you do not know something, write `unknown`. Do not leave it empty and do not guess.
4. Say "version" for each issued edition. Do not describe how the use case will be migrated.

## The two kinds of statement

Every statement is exactly one of these:

- **Current behavior** (`B1`, `B2`, ...). Something the source or a vendor-provided document shows. Write "When ... then ..." in business language and give the evidence: the source file and place, or the vendor document and place. The evidence also shows whether you saw the behavior in the source or read it in a vendor document, so never blur the two. Do not add a reason, a schedule or any fact the evidence does not show. A value, an address or a setting the source states is a behavior or a parameter, not a question.
- **Question** (`Q1`, `Q2`, ...). Something the source cannot show.

If you are not sure the source shows it, it is not a current behavior. A recommendation or an idea for a change is not a current behavior either.

## Record only the outcome the evidence proves

State what the evidence shows happened, and no more. Keep three things apart: a request that succeeded, a status the use case reports, and an actual delivery. For example, "the use case sends the message and the service accepts it" is not the same as "the message arrives" or "the use case reports success". If the source shows only the first, write only the first.

## Requests, responses and data transfers

Record each request, response and data transfer the evidence shows, in either direction: something the use case sends or asks for, and something it receives or is given. In the dependency table say, for each system, its role and the direction of every request, response and data transfer. In the diagram, draw the use case as one black box and only the external systems and the requests, responses and data transfers between them and the box.

## Retry and failure handling

When the source takes an explicit retry or failure-handling action (for example it tries again after a failed request, or it stops and reports a failure), write it as a current behavior and cover it with an acceptance scenario. Do not invent handling the source does not show; if the source shows none, write `unknown` in the failure-handling row of the operational context.

## The question rule

Ask only when both are true: the source cannot show the answer, and the answer would change what the migrated use case must do (the behavior that has to be preserved). Never ask what the source already states. Never ask the reason behind a behavior the source shows: state the behavior and leave any review of it to our team. Write one question per item.

## When a question is answered

Put the answer in the section it belongs to: a parameter, an external dependency, the operational context, or a current behavior. Add a new current behavior only if the answer establishes one. Then set the question's status to "resolved" and name what it updated, for example "resolved: now `B<n>`" or "resolved: see the parameters table". Keep the question's row. Record the change in the next version's change-log entry.

## Anchors and linking

Put an anchor in the first cell of each row you want to link to, for example `<a id="b1"></a>B1`. Use the lowercase ID (`b1`, `q1`, `ac1`). Link to it with `[B1](#b1)`. Every acceptance scenario has a "covers" line that links the behavior rows it proves, and every current behavior, including an explicit retry or failure-handling action, must be covered. In the diagram, write the behavior IDs as plain text in the edge labels, and link them in the plain-text description beside it.

## Operational context

Schedule and trigger, logging, monitoring and alerts, owner and failure handling are not behaviors. Cite a vendor document or a configuration in the source for each, otherwise write `unknown`. A row may point to the current behavior that records an explicit retry or failure-handling action.

## How to type the acknowledgement

Leave the acknowledgement log blank when you write the document. When the vendor replies, add one new row for that version in the Markdown source: company name, date acknowledged, version reviewed, script link and revision, the production-script box, the overall confirmation box and the tracker entry or reply reference (the tracker is the shared spreadsheet where the vendor replies). Type `[x]` in a box only if the vendor's reply says so. Write no person name or role. Never edit an earlier row. Leave the statement below the log as it is: an acknowledgement confirms that the named script and revision are the current production script and that the documented behavior is current for that version. It does not approve any future implementation and does not claim the behavior is free of errors.

## Tagging the repository

At each acknowledgement, tag the repository so that version can be recovered, for example `<use-case-name>-v<n>`. After an acknowledgement, a change adds a change-log entry and a new version number in the same file.

## Other rules

- The change log has one entry per version, newest last. A version that was acknowledged is not edited; a change adds an entry and a new version number.
- Behaviors: one row per behavior, only what the source or a vendor document shows.
- Questions: one question per item. Keep a question's row when it is answered.
- Every current behavior must be covered by at least one acceptance scenario.
