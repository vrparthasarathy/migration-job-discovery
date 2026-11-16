# Tracker Tools

## Purpose

The lead-facing Node tools for the use case tracker: a shared CSV table library, a reconciler that turns reviewed proposals and a tracker export into reviewable changes, and a daily summary. Leads run them by hand; the authoritative tracker stays an Excel workbook on SharePoint.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Tracker Tools**

- [Components](#components)
- [Design](#design)
  - [Diagram](#diagram)
- [Technology](#technology)
- [Links](#links)

## Components

| Component | Purpose |
| --- | --- |
| [Tracker Tables](tracker-tables/README.md#purpose) | A Node library that reads and writes the tracker's CSV tables, validates them against the shared schema, builds vendor views and does working-day arithmetic, so the reconciler and the summary share one correct implementation. |
| [Tracker Reconciler](tracker-reconciler/README.md#purpose) | A Node command line tool that compares reviewed tracker proposals with the latest tracker export and writes additions, field updates, conflicts and suggestions for a lead to review and apply by hand, never overwriting human edits. |
| [Tracker Summary](tracker-summary/README.md#purpose) | A Node command line tool that writes the internal daily summary across all vendor tracks from a tracker export: use cases by stage, overdue questions, blocked items, access actions, mappings pending a decision and next batch suggestions. |
| [Sample Tracker Workbook](sample-tracker-workbook/README.md#purpose) | A small, realistic sample of the final Excel tracker, generated from fictional data, so the team can review the format of the sheets before the real tracker is built. |
| [Review CSV Exporter](review-csv-exporter/README.md#purpose) | A Node command line tool that turns tracker proposals and a tracker export into consolidated review CSVs, one wide row per record ordered by what needs a lead's judgment, so leads review adds, updates and suggestions without transposing proposal rows. |
| [Vendor Workbook Updater](vendor-workbook-updater/README.md#purpose) | A Node command line tool that applies the review rows a lead accepted to one vendor's vendor-facing workbook, starting from the copy downloaded from SharePoint, and writes a new vendor-safe `.xlsx` for the lead to upload by hand. |

## Design

The group holds five deliverables that leads run by hand on exported CSV files and a sample for team review, and it has no behavior of its own. The [Tracker Tables](tracker-tables/README.md#design) library reads, validates and writes the tracker's CSV tables, builds the vendor view and does the working-day arithmetic. The [Tracker Reconciler](tracker-reconciler/README.md#design) and the [Tracker Summary](tracker-summary/README.md#design) command line tools both import it by relative path, and all three read the column list, owner classes, keys and visibility from the shared `tracker-schema.csv` of the Tracker Data Contract, so no column list is repeated in code. The reconciler turns proposals and an export into reviewable files for a lead to apply by hand, and the summary writes the internal daily summary from an export. Neither tool writes to SharePoint, releases a question or changes a file it reads. The [Sample Tracker Workbook](sample-tracker-workbook/README.md#design) is not a lead tool: it generates a fictional sample of the final Excel tracker from CSV data shaped by the same schema, validates it with the table library and counts working days with it, so the team can review the format before the real tracker is built; it is internal and not vendor-safe. The [Review CSV Exporter](review-csv-exporter/README.md#design) is a fourth lead tool: it imports the Tracker Tables library and the Tracker Reconciler's loaders and classification by relative path, reads the shared schema and writes consolidated review CSVs for a lead to review, and adds no dependency. The [Vendor Workbook Updater](vendor-workbook-updater/README.md#design) is a fifth lead tool: it starts from a vendor workbook the lead downloaded from SharePoint, applies the review rows a lead accepted and writes a new vendor-safe `.xlsx`, a report and the review files' `applied_on` cells for the lead to upload by hand. It imports the Tracker Tables library, the reconciler's export loader and secret detection, the exporter's review reading and the sample's layout rules by relative path, and adds the same pinned `exceljs` dependency. The shared check declarations (`test`, `coverage`, `testGlob`, `adapterGlob`) live in this group's `craft.json` and are inherited by the members.

### Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  grp[["Tracker Tools"]]
  tracker_tables["<a href='tracker-tables/README.md#diagram'>Tracker Tables</a>"]
  tracker_reconciler["<a href='tracker-reconciler/README.md#diagram'>Tracker Reconciler</a>"]
  tracker_summary["<a href='tracker-summary/README.md#diagram'>Tracker Summary</a>"]
  schema(["tracker-schema.csv (Tracker Data Contract)"])
  tracker_reconciler -->|"reads, validates and projects with"| tracker_tables
  tracker_summary -->|"reads, validates and counts working days with"| tracker_tables
  sample["<a href='sample-tracker-workbook/README.md#diagram'>Sample Tracker Workbook</a>"]
  sample -->|"validates and counts working days with"| tracker_tables
  exporter["<a href='review-csv-exporter/README.md#diagram'>Review CSV Exporter</a>"]
  exporter -->|"reads, validates and writes with"| tracker_tables
  exporter -->|"classifies changes with"| tracker_reconciler
  updater["<a href='vendor-workbook-updater/README.md#diagram'>Vendor Workbook Updater</a>"]
  updater -->|"reads, validates and counts working days with"| tracker_tables
  updater -->|"loads the export and detects secrets with"| tracker_reconciler
  updater -->|"reads review files with"| exporter
  updater -->|"follows the layout of"| sample
  tracker_tables -->|"loads columns and owner classes from"| schema
```

## Technology

- Node 26 with native TypeScript (erasable syntax, `.ts` import extensions), no dependencies and `node:test`, as in the sibling `website-availability-check`, except that the Sample Tracker Workbook and the Vendor Workbook Updater each add one pinned dependency, `exceljs`, to write `.xlsx` files (their `install` check is `npm ci`); CSV is read and written by the library's own code. Checks are declared here and inherited by the members. No `typecheck`, `lint` or `boundaries` check is declared, because each needs a development dependency. Detail is in [requirements.md](requirements.md#requirements).

## Links

- [requirements.md](requirements.md#requirements) — what the group and its members must do and what they need not.
- [contract.md](contract.md#contract) — the shared check declarations and the command line of the members.
