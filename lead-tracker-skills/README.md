# Lead Tracker Skills

## Purpose

The Copilot agent skills a lead uses in chat to work with the output of the lead tracker tools, starting with the one that records and revisits decisions on the review CSVs. The tools themselves stay Node tools in Tracker Tools and run in the client environment.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Lead Tracker Skills**

- [Components](#components)
- [Design](#design)
  - [Diagram](#diagram)
- [Relationships](#relationships)
- [Links](#links)

## Components

| Component | Purpose |
| --- | --- |
| [Review Decisions](review-decisions/README.md#purpose) | A GitHub Copilot agent skill that walks a lead through the pending rows of the review CSVs, records accept, reject or clarify only from the lead's own words in that row's review cells, accepts a use case's plain additions in one step and lets the lead change an earlier decision, so decisions are made in chat and nobody edits the review CSVs by hand. |

## Design

The group holds one skill, [Review Decisions](review-decisions/README.md#design), and has no behavior of its own. The lead tracker tools stay Node tools in [Tracker Tools](../tracker-tools/README.md#purpose) and run in the client environment; the skill handles what a script cannot do well, which is taking a decision from the lead's words in chat and writing it into the review cells of the CSVs the Review CSV Exporter produced.

### Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  rd["<a href='review-decisions/README.md#diagram'>Review Decisions</a>"]
```

## Relationships

- [Review CSV Exporter](../tracker-tools/review-csv-exporter/README.md#purpose) — writes the review CSVs the skill edits and owns the headings file it reads.
- [Discovery Orchestrator](../discovery-orchestrator/README.md#purpose) — can hand the review of each folder to the skill after the export.

## Links

- [requirements.md](requirements.md#requirements) — what the group's skills share and must not do.
- [contract.md](contract.md#contract) — the rules every skill folder follows.
