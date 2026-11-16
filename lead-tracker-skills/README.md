# Lead Tracker Skills

## Purpose

The Copilot agent skills a lead uses in chat to work with the output of the lead tracker tools, starting with the one that records and revisits decisions on the review CSVs. The tools themselves stay Node tools in Tracker Tools and run in the client environment.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Lead Tracker Skills**

- [Components](#components)
- [Design](#design)
- [Relationships](#relationships)
- [Links](#links)
- [Plan](#plan)
  - [Planned Navigation](#planned-navigation)
  - [Planned Components](#planned-components)
  - [Planned Design](#planned-design)
    - [Planned Diagram](#planned-diagram)
  - [Planned Relationships](#planned-relationships)
  - [Planned Links](#planned-links)

## Components

| Component | Purpose |
| --- | --- |
| [Review Decisions](review-decisions/README.md#purpose) | A GitHub Copilot agent skill that walks a lead through the pending rows of the review CSVs, records accept, reject or clarify only from the lead's own words in that row's review cells, accepts a use case's plain additions in one step and lets the lead change an earlier decision, so decisions are made in chat and nobody edits the review CSVs by hand. |

## Design

Not built yet.

## Relationships

- [Review CSV Exporter](../tracker-tools/review-csv-exporter/README.md#purpose) — writes the review CSVs the skill edits and owns the headings file it reads.
- [Discovery Orchestrator](../discovery-orchestrator/README.md#planned-design) — hands the review of each folder to the skill after the export.

## Links

- [requirements.md](requirements.md#requirements) — what the group's skills share and must not do.
- [contract.md](contract.md#contract) — the rules every skill folder follows.

## Plan

### Planned Navigation

[Job Behavior Specifications](../README.md#plan) / **Lead Tracker Skills**

- [Planned Components](#planned-components)
- [Planned Design](#planned-design)
  - [Planned Diagram](#planned-diagram)
- [Planned Relationships](#planned-relationships)
- [Planned Links](#planned-links)

### Planned Components

| Component | Purpose |
| --- | --- |
| [Review Decisions](review-decisions/README.md#planned-design) | A GitHub Copilot agent skill that walks a lead through the pending rows of the review CSVs, records accept, reject or clarify only from the lead's own words in that row's review cells, accepts a use case's plain additions in one step and lets the lead change an earlier decision, so decisions are made in chat and nobody edits the review CSVs by hand. |

### Planned Design

The group holds one skill, [Review Decisions](review-decisions/README.md#planned-design), and has no behavior of its own. It replaces the earlier plan of four Markdown counterparts of the Node tools (Proposal Reconciliation, Review Queue Export, Daily Call Briefing and Vendor Sheet Update), which was withdrawn because the user confirmed on 2026-11-16 that scripts can run in the client environment: the Tracker Reconciler, Review CSV Exporter, Tracker Summary and Vendor Workbook Updater stay Node tools in [Tracker Tools](../tracker-tools/README.md#plan) and are shipped to the client as they are. The skill handles what a script cannot do well, which is taking a decision from the lead's words in chat and writing it into the review cells of the CSVs the exporter produced. Later lead skills (for example a runbook helper) would join the group; none is planned now.

#### Planned Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  rd["<a href='review-decisions/README.md#planned-diagram'>Review Decisions</a>"]:::planned
  classDef planned stroke-dasharray: 5 5,stroke:#2563eb
```

### Planned Relationships

- [Review CSV Exporter](../tracker-tools/review-csv-exporter/README.md#purpose) — writes the review CSVs the skill edits and owns the headings file it reads.
- [Discovery Orchestrator](../discovery-orchestrator/README.md#planned-design) — hands the review of each folder to the skill after the export.

### Planned Links

- [requirements.md](requirements.md#requirements) — what the group's skills share and must not do.
- [contract.md](contract.md#contract) — the rules every skill folder follows.
