# Filling Guide

How to fill in the template for one vendor use case. You need only a text editor or GitHub Copilot. The finished document is read by a business reviewer, so use short, plain sentences and explain any technical term the first time you use it.

## Where to type

1. Copy the template and name the copy after the use case, using the vendor's own name for it. Never rename it.
2. Replace every text in curly brackets with your own words. Keep every heading.
3. Where you do not know something, write `unknown`. Do not leave it empty and do not guess.
4. Say "version" for each issued edition. Do not describe how the job will be built or grouped.

## The two kinds of statement

Every statement is exactly one of these:

- **Current behavior** (`B1`, `B2`, ...). Something the source or a vendor-provided document shows. Write "When ... then ..." in business language and give the evidence: the source file and place, or the vendor document and place. Do not add a reason, a schedule or any fact the evidence does not show. A value, an address or a setting the source states is a behavior or a parameter, not a question.
- **Question** (`Q1`, `Q2`, ...). Something the source cannot show.

If you are not sure the source shows it, it is not a current behavior.

## The question rule

Ask only when both are true: the source cannot show the answer, and the answer would change what the migrated workflow must do. Never ask what the source already states. Never ask the reason behind a behavior the source shows: state the behavior and leave any review of it to our team. Write one question per item. When one is answered, set its status to "resolved: now `B<n>`" and add that behavior in the next version.

## Anchors and linking

Put an anchor in the first cell of each row you want to link to, for example `<a id="b1"></a>B1`. Use the lowercase ID (`b1`, `q1`, `ac1`). Link to it with `[B1](#b1)`. Every acceptance scenario has a "covers" line that links the behavior rows it proves, and every current behavior must be covered. In the diagram, write the behavior IDs as plain text in the call labels, and link them in the plain-text description beside it.

## Operational context

Schedule and trigger, logging, monitoring and alerts, owner and failure handling are not behaviors. Cite a vendor document or a configuration in the source for each, otherwise write `unknown`.

## How to type the acknowledgement

Leave the acknowledgement log blank when you write the document. When the vendor replies, add one new row for that version in the Markdown source: company name, date acknowledged, version reviewed, script link and revision, the production-script box, the overall confirmation box and the tracker entry or reply reference (the tracker is the shared spreadsheet where the vendor replies). Type `[x]` in a box only if the vendor's reply says so. Write no person name or role. Never edit an earlier row.

## Tagging the repository

At each acknowledgement, tag the repository so that version can be recovered, for example `<use-case-name>-v<n>`. After an acknowledgement, a change adds a change-log entry and a new version number in the same file.

## Other rules

- The change log has one entry per version, newest last. A version that was acknowledged is not edited; a change adds an entry and a new version number.
- Behaviors: one row per behavior, only what the source or a vendor document shows.
- Questions: one question per item. Keep a question's row when it is answered.
- Every current behavior must be covered by at least one acceptance scenario.
