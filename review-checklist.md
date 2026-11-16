# Review Checklist

Internal review of the document and skill behaviors `B01` to `B05` in the root [README.md](README.md#behavior). Not sent to anyone. Use it as a reviewer who has not seen the files before. Mark each item pass or fail. This is the stand-in for automated checks of the documents and skills: no tool runs it, and the root tests in `test/` repeat only the plain file comparisons of `B01` and `B05`. Items stay unticked until a fresh review passes them. `B06` to `B08` are checked by the root integration tests and are not listed here.

Testing policy (user decision, 2026-11-15): no Copilot dry run is required for this review. `B03` is checked by reading the drafting skill's files, never by running Copilot. The user's manual tests of the skills in the client environment on real use cases are recorded as user-reported evidence for the version they cover (see `copilot-drafting-guide/requirements.md`) and tick nothing here.

Files in scope. Pack: `job-behavior-template/job-behavior-template.md`, `job-behavior-template/filling-guide.md`, `website-check-job-behavior/website-availability-check.md`, the folder `copilot-drafting-guide/document-job-behavior/`, `copilot-drafting-guide/usage-and-model-guidance.md`, `copilot-drafting-guide/drafting-prompt.md`. Toolkit: the folders `tracker-update-proposer/propose-tracker-updates/`, `identity-access-discovery/discover-identity-access/` and `workflow-recommender/recommend-workflows/`, and in `tracker-data-contract/` the files `tracker-data-contract.md`, `tracker-schema.csv`, `workbook-layout-guide.md`, `tracker-updates-template.csv` and `use-case-inventory-template.csv`. Vendor-readable: the template, the filling guide, the reference specification and the skill's template copy.

- [ ] [B01] The template, the reference specification and the skill's template copy have the same part headings in the same order (compare the `##` and `###` lines; only the document title names the use case), the same ID scheme (`B1`, `Q1`, `AC1`, each ID in the first column with a lowercase anchor such as `<a id="b1"></a>`) and the same part list as the template contract's part list; and `copilot-drafting-guide/document-job-behavior/job-behavior-template.md` is identical to `job-behavior-template/job-behavior-template.md` (`cmp` prints nothing).
- [ ] [B02] None of the pack and toolkit files above contains a Craft file name, command or term (scan below), none needs anything installed beyond plain Markdown, CSV and GitHub Copilot in VS Code agent mode, and the specification's links and Mermaid diagram work when its file is viewed in a repository on GitHub (open it there; the checks here cannot render it).
- [ ] [B03] Read, not run. `SKILL.md` (the Acknowledgement section and step 4 of the method), `usage-and-model-guidance.md` and `drafting-prompt.md` each say the skill never ticks, confirms or records an acknowledgement on its own, records one only when the developer gives the facts (company, date, version reviewed, script link and revision, tracker entry or reply reference) and leaves the acknowledgement log blank otherwise; and `SKILL.md`, the guidance and the fallback accept the core files (the source, `external_tools.md` and `logic.md`), manually tagged documents and supplied findings, questions, corrections and dependency observations as they are, without asking the developer to rewrite them first. The guidance records the user's manual client-environment results only as user-reported evidence for a named version and claims no pass.
- [ ] [B04] In the team-facing files `use case` names the business unit, `job` or `script` names only the vendor's script, and `workflow` means only the reusable implementation, defined once (in `tracker-data-contract/tracker-data-contract.md`, in its vocabulary list); and no vendor-readable file (template, filling guide, reference specification, template copy) mentions workflows or grouping (scan below).
- [ ] [B05] Every copy of `tracker-data-contract.md` and `tracker-schema.csv` in the three skill folders is byte-identical to the file in `tracker-data-contract/` (`cmp` prints nothing for all six), no other copy exists, and the reconciler and the summary load the schema from `tracker-data-contract/tracker-schema.csv` (their `src/cli.ts` names that path) and keep no copy.

## Scans

Run from the project root. Each should print nothing.

```sh
# B02: a Craft term in a pack or toolkit file
grep -rniE "craft|tasks\.md|craft\.json|review-checklist|worktree|component record" \
  job-behavior-template/job-behavior-template.md job-behavior-template/filling-guide.md \
  website-check-job-behavior/website-availability-check.md copilot-drafting-guide/document-job-behavior \
  copilot-drafting-guide/usage-and-model-guidance.md copilot-drafting-guide/drafting-prompt.md \
  tracker-update-proposer/propose-tracker-updates identity-access-discovery/discover-identity-access \
  workflow-recommender/recommend-workflows tracker-data-contract/tracker-data-contract.md \
  tracker-data-contract/tracker-schema.csv tracker-data-contract/workbook-layout-guide.md \
  tracker-data-contract/tracker-updates-template.csv tracker-data-contract/use-case-inventory-template.csv

# B04: workflows or grouping in a vendor-readable file
grep -niE "workflow|group" job-behavior-template/job-behavior-template.md job-behavior-template/filling-guide.md \
  website-check-job-behavior/website-availability-check.md copilot-drafting-guide/document-job-behavior/job-behavior-template.md

# B01 and B05: copies that differ
cmp job-behavior-template/job-behavior-template.md copilot-drafting-guide/document-job-behavior/job-behavior-template.md
for d in tracker-update-proposer/propose-tracker-updates identity-access-discovery/discover-identity-access workflow-recommender/recommend-workflows; do
  for f in tracker-data-contract.md tracker-schema.csv; do cmp tracker-data-contract/$f $d/$f; done
done
```

A hit that is a Craft term fails `B02`; a hit in a vendor-readable file for `workflow` or `group` fails `B04`. Words such as `reviewer` (the filling guide's "business reviewer", GitHub's "required reviewers") and a bare `contract.md` inside `tracker-data-contract.md` are not Craft terms and the scan above leaves them out.

Builder's observation, 2026-11-16, not a review and ticking nothing: the three scans above printed nothing and the root tests in `test/documents.test.ts` passed. A fresh reviewer still reads the files for the items above, in particular the plain-wording parts of `B02` to `B04`, which a scan cannot judge.

## Review state

| Item | Method | State |
| --- | --- | --- |
| `B01` | file comparison, also run by `test/documents.test.ts` | unticked, awaiting a fresh review |
| `B02` | scan and file review; GitHub view by a person | unticked, awaiting a fresh review |
| `B03` | file review of the drafting skill's files | unticked, awaiting a fresh review; no Copilot result is claimed |
| `B04` | scan and file review | unticked, awaiting a fresh review |
| `B05` | file comparison, also run by `test/documents.test.ts` | unticked, awaiting a fresh review |
