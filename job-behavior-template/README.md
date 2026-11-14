# Job Behavior Template

## Purpose

The blank, reusable form a developer fills in to document one vendor job from its source code, written in plain language for a business reviewer and usable with a text editor or GitHub Copilot alone.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Job Behavior Template**

- [Design](#design)
  - [Diagram](#diagram)
- [Behavior](#behavior)
- [Relationships](#relationships)
- [Links](#links)

## Design

The component is one Markdown form, [job-behavior-template](job-behavior-template.md), a short plain-language [filling-guide](filling-guide.md) and one internal review checklist, [review-checklist](review-checklist.md). The form and the guide are the deliverables and mention no Craft; the form has no fill-in part and no job ID.

Parts of the form, derived from B01 to B10 (also in [contract.md](contract.md#part-list), for review):

1. Header (B07)
2. About this document, with a contents list (B01, B07, B10)
3. Change log (B07)
4. Current behaviors, `B1`.. with evidence pointers (B02, B03)
5. Questions, `Q1`.. (B02, B10)
6. Inputs, outputs, parameters, external dependencies (B04)
7. Diagram with plain-text description (B05)
8. Acceptance scenarios, `AC1`.. with covers lines (B06)
9. Operational context (B09)
10. Acknowledgement log (B08)

Assumptions: versions are whole numbers in one file with a change log; the repository is tagged at each acknowledgement; the vendor never edits the document; the acknowledgement is typed in the Markdown source by our team and blank in the template; anchors are explicit `<a id>` tags that work on GitHub; no requested-changes part and no traceability table. The "vendor", "our team", "tracker" and "black box" terms are defined in the form. No automated checks are declared; the dry-run review in the checklist is the validation.

### Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  guide["filling-guide"]:::file -->|"explains how to fill"| tmpl["job-behavior-template"]:::file
  chk["review-checklist"]:::file -->|"validates"| tmpl
  chk -->|"validates"| guide
  click guide "filling-guide.md"
  click tmpl "job-behavior-template.md"
  click chk "review-checklist.md"
  classDef file stroke:#333
```

## Behavior

- **B01** When a document is made from the template, then it contains no fill-in instructions, no Craft reference and no internal job ID, and a separate filling guide explains in plain language how to fill it in and needs only a text editor or GitHub Copilot. (untested: benchmark pending)
- **B02** When a job's behavior is recorded, then each statement sits in exactly one of two kinds, current behavior (`B1`, `B2`, ...) or question (`Q1`, `Q2`, ...), an inferred statement is never recorded as current behavior, and a question is asked only when the source cannot show the answer and the answer would change what the migrated workflow must do. (untested: benchmark pending)
- **B03** When a current behavior is entered, then it has an ID, a business-language when/then statement and an evidence pointer to the source (file and place) or to a vendor-provided document (document and place), and it states no reason, schedule or other fact that the evidence does not show. (untested: benchmark pending)
- **B04** When the contracts are filled in, then inputs, outputs, parameters (name and this job's value) and external dependencies each have a table, each dependency states its role and the direction of every call, and a parameter value that the source states is listed there and is not turned into a question. (untested: benchmark pending)
- **B05** When the diagram is drawn, then the job is one black box with only external systems, outgoing calls and incoming responses, laid out vertically with the project's diagram settings, with the behavior IDs in the edge labels as plain text and a plain-text description beside it that links each ID. (untested: benchmark pending)
- **B06** When acceptance scenarios are written, then they form their own part, each (`AC1`, `AC2`, ...) is given/when/then with a "covers" line that links the behavior rows it proves, every current behavior is covered by at least one scenario, and an answered question carries a "resolved: now Bn" note. (untested: benchmark pending)
- **B07** When a document is issued, then the header holds the use case name, version, date, status (draft or acknowledged) and source revision with the script link and no job ID, an "About this document" part and a contents list with links follow the header before the change log, and the change log has one entry per version in the same file. (untested: benchmark pending)
- **B08** When the vendor acknowledges, then an acknowledgement log has one row per version (company name, date acknowledged, version reviewed, script link and revision, production-script tick box, one overall confirmation, tracker entry or reply reference) with no person name or role, earlier rows are never edited, our team tags the repository at each acknowledgement, and a plain statement says what the acknowledgement does and does not claim. (untested: benchmark pending)
- **B09** When operational context is recorded, then it is its own part and never a current behavior, and each row of schedule and trigger, logging, monitoring and alerts, owner and failure handling cites a vendor document or configuration in the source or says `unknown`. (untested: benchmark pending)
- **B10** When the document is read, then the "About this document" part states its purpose and says nothing about how the job will be built or grouped, each question is a separate item the vendor answers one by one, and there is no similarity, grouping or implementation field. (untested: benchmark pending)

## Relationships

- None outside its lineage. It is used by [Website Check Job Behavior](../website-check-job-behavior/README.md#purpose) and [Copilot Drafting Guide](../copilot-drafting-guide/README.md#purpose), which are siblings.

## Links

- [requirements.md](requirements.md#requirements) — what the component must do and what it need not.
- [contract.md](contract.md#contract) — the content the document must carry, the part list and the wording rules.
- [job-behavior-template.md](job-behavior-template.md) — the blank form delivered by this component.
- [filling-guide.md](filling-guide.md) — the plain-language filling guide.
- [review-checklist.md](review-checklist.md) — the dry-run review items, tagged by behavior.
