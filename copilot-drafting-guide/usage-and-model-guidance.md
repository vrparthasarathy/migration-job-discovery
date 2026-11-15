# Usage and model guidance

How our team's developers use GitHub Copilot to draft a job behavior document, and which models to try. Copilot's output is a draft that a person must review against the source before it goes anywhere.

## Before you start

- The skill is the folder `document-job-behavior/` (`SKILL.md`, a copy of the template and `self-check.md`). Put it in `.github/skills`, `.claude/skills` or `.agents/skills` of the repository that holds the job. The skill name equals the folder name.
- GitHub's documentation says Copilot loads a skill when it is relevant, and lists the Copilot app, the command line, the cloud agent and agent mode in VS Code, Visual Studio and JetBrains as places skills run. It does not state plan or administrator requirements or whether the feature is still in preview. Confirm skill support in your own Copilot setup (your plan and your administrator's policy) before you rely on it. Where skills are not available, use `drafting-prompt.md` instead.
- A skill cannot block manual edits. Anyone can still edit the document by hand, so the rules below depend on people and on repository settings.

## Draft a document in VS Code agent mode

1. Open the repository that holds the job and start Copilot Chat in agent mode.
2. Ask for the document by name, for example: "Document the job behavior of the use case `<name>` from `<path to the job source>`." Say which files make up the job. If the source is large, give it in parts, one folder or a few files at a time, and ask Copilot to extend the same document.
3. Optional vendor documents: if the vendor gave documents about the job, name them in the request. They take precedence over documents our team created, which are used only for points no vendor document covers. Where a vendor document and the code disagree, the draft records a question instead of choosing.
4. Copilot writes one file named after the use case, using only the parts of the template, and ends its reply with a self-check report (source and documents not read, behaviors with no scenario, scenarios naming unknown IDs, statements without an evidence pointer). The report is best effort, not a guarantee.

## Review the draft against the source

Read every current behavior beside the source it cites. Check that each one is shown by the evidence, that nothing is inferred, that no reason or schedule was added, and that every question is something the source cannot show and whose answer would change what the migrated workflow does. Check the diagram too: one box, behavior IDs in the labels, links in the text beside it. Fix the file by hand or ask Copilot to correct it, then review again.

## Apply answers

When the vendor or our team answers questions, give the answers to Copilot with the file: "Update `<file>` with these answers: Q2 is ..., Q4 is ...". Copilot updates the same file. Each answered question becomes a current behavior marked "resolved: now Bn", a change-log entry is added and the version is bumped. It never edits an earlier acknowledgement row. Review the update against the answers as you did the draft.

## Record an acknowledgement

The vendor's reply arrives in the tracker. You give Copilot the facts: company, date acknowledged, version reviewed, script link and revision, and the tracker entry or reply reference. Copilot adds one row with exactly those facts. It does not tick or confirm anything on its own: ticking a box is a decision you make from the vendor's reply, and you type it or tell Copilot to.

## Tag and protect

- Tag the repository at each acknowledgement, for example `<use-case-name>-v<n>`, so that version can be recovered. Copilot reminds you after an update; it does not create the tag.
- Protecting acknowledged versions, for example with protected branches and required reviewers, is set in the repository and is outside this deliverable.

## Model advice

Team-reported and environment-dependent. The models below are the ones our developers reported in their Copilot model picker. This list is valid as of 2026-11-14. Availability changes: check the model picker, your plan and your administrator's policy before relying on it, and re-check the date.

Team-reported picker models: GPT-6 Luna, GPT-6.1 Sol, Claude Sonnet 5.5, GPT-5.6 Luna, GPT-6 Sol, GPT-5.3-Codex.

- No model is guaranteed to give a correct document. Output varies by model and by run.
- GitHub's documentation suggests GPT-5.3-Codex for complex engineering and review.
- For the GPT-6 models, the GitHub task guidance was not read, so no task advice is given. Try the model on the website job sample (the source in `website-availability-check/src/` of the specifications repository), compare its document with the finished reference document `website-availability-check.md` kept beside it, and keep the model that comes closest. Do the same for any other model in the list.
- Terra, Fable and Kimi models are not available in the team's picker, so they are not recommended here.

Note which model and date produced a draft, so a difference between runs can be understood.
