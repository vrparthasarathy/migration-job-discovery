# Requirements: Copilot Drafting Guide

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The component is a GitHub Copilot agent skill, written once in its folder. Files our team uses: the skill folder `document-job-behavior/` (`SKILL.md`, a copy of the template and `self-check.md`), `usage-and-model-guidance.md` and the fallback `drafting-prompt.md` for surfaces without skills.
- The skill drafts from the job's source and from vendor-provided documents when given (an optional input). Vendor-provided documents take precedence over documents our team created; our documents are used only where no vendor document covers the point, and where a vendor document and the code disagree it records a question. The source remains what shows current behavior.
- Question rule: it asks only what the source cannot show and whose answer would change what the migrated workflow must do; it never asks what the source states and never the reason behind a behavior the source shows.
- It updates the same file when the developer gives answers (from the vendor or our team): each answered question becomes a current behavior marked "resolved: now Bn", a change-log entry is added, the version is bumped, an earlier acknowledgement row is never edited, and the developer is reminded to tag the repository.
- It never ticks, confirms or records an acknowledgement on its own. It records one only from facts a developer gives it (company, date, version, reference), writing exactly those.
- The self-check report lists the source and documents not read, current behaviors with no scenario, scenarios naming unknown IDs and statements without an evidence pointer. It is best effort, not a guarantee, and a person reviews the draft against the source.
- Nothing in the skill folder, the guidance or the fallback mentions Craft or needs anything installed in VS Code agent mode.
- A skill cannot block manual edits. The guidance says acknowledged versions are tagged in the repository and protected by repository settings (protected branches, required reviewers), which are outside this deliverable, and says to confirm skill support in the developers' Copilot setup.
- Per GitHub's docs, project skills live in `.github/skills`, `.claude/skills` or `.agents/skills`, Copilot loads a skill when it is relevant, and skills run in the Copilot app, CLI, cloud agent and agent mode in VS Code, Visual Studio and JetBrains. The docs read do not state plan or administrator requirements or preview status. The skill `name` equals its folder name.
- The user reports the models in the developers' Copilot picker as GPT-6 Luna, GPT-6.1 Sol, Claude Sonnet 5.5, GPT-5.6 Luna, GPT-6 Sol and GPT-5.3-Codex, and that Fable and Kimi are not available; Terra models are not in that list. All six appear on GitHub's supported-models page read on 2026-11-14, but the task guidance read from GitHub covers the GPT-5.6 family, GPT-5.3-Codex and Claude Sonnet 4.6, not the GPT-6 models, so the guide gives task advice only where the docs support it and otherwise tells the developer to try the model on the website job sample. The list comes from the user and is written as team-reported.
- GitHub's docs suggest GPT-5.3-Codex for complex engineering and review. The docs' suggestion of a Terra model is not repeated, because Terra, Fable and Kimi are not available in the team's picker; the guide names only the six picker models.

## Must match the source

- The template's parts and ID scheme ([Job Behavior Template](../job-behavior-template/requirements.md#requirements)) and the one-box diagram rule. The template copy inside the skill folder must be identical to the template.

## Need not match

- A particular Copilot model's wording, or identical output between runs.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README (`B01` style) describe this component. The behaviors a job document records (`B1` style) belong to the job. They sit in different files and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule. A first dry run of the earlier skill was exploratory and ticked nothing.
- **Document files versus records.** The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md` and `review-checklist.md` beside the deliverables are internal and are never sent to the vendor. Copying the finished files out is a manual step.
- **Two kinds of diagram.** The diagram in a component's README shows components. The one-box diagram inside a job document is deliverable content and follows its own rule.
- **Stale model guidance.** Model availability changes, so the guidance carries a valid-as-of date and a re-check step.
- **Output varies.** Copilot output differs between models and runs; the behaviors can be judged only on samples.
- **Two copies of the instructions.** The fallback prompt repeats the skill's instructions, and the skill folder holds a copy of the template. Both must be kept in step; the root checks the template copy.
