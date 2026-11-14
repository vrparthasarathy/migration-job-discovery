# Review Checklist

Internal dry-run review of `job-behavior-template.md` and `filling-guide.md`. Use it as a reviewer who has not seen them before. Mark each item pass or fail. This is the stand-in for automated checks; no tool runs it. Items stay unticked until a fresh review passes them.

- [x] [B01] The template has no fill-in instructions, no Craft reference and no job ID, and `filling-guide.md` explains in plain language how to fill it in, mentions no Craft, and needs only a text editor or GitHub Copilot.
- [x] [B02] Statements sit in exactly one of two kinds, current behavior (`B1`..) or question (`Q1`..); an inferred statement is never a current behavior; the question rule (source cannot show it and the answer would change the workflow) is stated.
- [x] [B03] Each current behavior row has an ID, a business-language when/then statement and an evidence pointer (file and place, or vendor document and place), and no reason, schedule or other fact the evidence does not show.
- [x] [B04] Separate tables exist for inputs, outputs, parameters (name and this job's value) and external dependencies; dependencies state role and direction of every call; a parameter value the source states is not turned into a question.
- [x] [B05] The diagram is one black box with external systems, outgoing calls and incoming responses, `flowchart TB` with the elk front matter and loose security line, behavior IDs as plain text in edge labels, and a plain-text description beside it that links each ID.
- [x] [B06] Acceptance scenarios (`AC1`..) are their own part, given/when/then with a "covers" line that links behavior rows, every behavior is covered, and an answered question carries "resolved: now Bn".
- [x] [B07] The header holds use case name, version, date, status and source revision with script link and no job ID; "About this document" and a contents list with working links follow it before the change log; the change log has one entry per version in the same file.
- [x] [B08] The acknowledgement log has one row per version with company name, date, version reviewed, script link and revision, production-script tick box, one overall confirmation and tracker reference; no person name or role; blank; earlier rows never edited; repository tagged at each acknowledgement; plain statement of what it does and does not claim.
- [x] [B09] Operational context is its own part, not a behavior, and each row cites evidence or says `unknown`.
- [x] [B10] "About this document" states its purpose and says nothing about how the job will be built or grouped; each question is a separate item; no similarity, grouping or implementation field.
- [x] [Rules] No Craft term, `baseline`, `CUR-`, `ASM-` or `SC-` in the template or guide; file names appear only in evidence pointers.
