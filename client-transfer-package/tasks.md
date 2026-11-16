# Task

## Requirement

A Python 3 (standard library only) tool that packs the completed Job Behavior Specifications build for transfer into the client environment as one text-only zip, `AIRO-Client-Transfer.zip`: every member is the original file renamed `<name>.txt` with identical bytes. The package holds the five Copilot skill folders (document-job-behavior, discover-identity-access, propose-tracker-updates, recommend-workflows, run-discovery), the tracker contract, schema, templates and layout guide, the process guide and usage guidance, the job behavior template and filling guide, the reference specification, the tracker tools with tests and fictional fixtures, the root integration tests with the files they read (and optionally the Sample Tracker Workbook sources and data), a manifest (revision, original path, packaged path, byte size; no hashes), `START-HERE.txt`, `COPILOT-RESTORE-PROMPT.txt`, `CLIENT-QUICKSTART.md.txt`, `VERIFICATION.txt` and `restore.py.txt`. Copilot restores it into a fresh staging folder, installs the skill folders into `.github/skills` replacing existing copies (the user accepts replacement), never replaces `AGENTS.md` or unrelated configuration, and makes no commits, pushes or external calls. A `verify` command restores into a clean directory, compares bytes with the source, runs the packaged tests where Node is available and checks the zip. Local checks never claim Copilot skill discovery or client use cases are validated. No email is created. This is a first draft to refine after the team's feedback.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build client-transfer-package`.
