# Requirements: Copilot Drafting Guide

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The component is a GitHub Copilot agent skill, written once in its folder. Files for our team: the skill folder `document-job-behavior/` (`SKILL.md`, a copy of the template and `self-check.md`), `usage-and-model-guidance.md` and the fallback `drafting-prompt.md` for surfaces without skills.
- The skill creates a job document from the template, drafts it from the job's source with file-and-place pointers and open questions, returns a self-check report, and creates the next version as a new copy with the header and change log updated. It never writes the acknowledgement, never marks anything confirmed, never edits an acknowledged version in place and never presents an inferred statement as current behavior.
- The self-check report lists the source not read, current behaviors with no scenario, scenarios naming unknown IDs and statements without a source pointer. It is best effort, not a guarantee, and a person reviews the draft against the source.
- No file in the skill folder, the usage guidance or the fallback prompt mentions Craft or needs anything installed in VS Code agent mode.
- A skill cannot block manual edits. The guidance suggests one file per version and repository protections (protected branches, required reviewers) as outside this deliverable, and says to confirm skill support in the developers' Copilot setup.
- Per GitHub's docs, project skills live in `.github/skills`, `.claude/skills` or `.agents/skills`, Copilot loads a skill when it is relevant, and skills run in the Copilot app, CLI, cloud agent and agent mode in VS Code, Visual Studio and JetBrains. The docs read do not state plan or administrator requirements or preview status. Our team's developers use VS Code agent mode, where the user says skills work.
- Model advice was checked on 2026-11-14 against GitHub's [supported models](https://docs.github.com/en/copilot/reference/ai-models/supported-models) and [model comparison](https://docs.github.com/en/copilot/reference/ai-models/model-comparison) pages (read through a summarizer, truncated, no last-updated date shown). It is marked environment-dependent with a valid-as-of date and tells the reader to check the model picker, plan and administrator policy. It calls no model guaranteed.
- The user reports the models in the developers' Copilot picker as GPT-6 Luna, GPT-6.1 Sol, Claude Sonnet 5.5, GPT-5.6 Luna, GPT-6 Sol and GPT-5.3-Codex, and that Fable and Kimi are not available; Terra models are not in that list. All six appear on GitHub's supported-models page read on 2026-11-14, but the task guidance read from GitHub covers the GPT-5.6 family, GPT-5.3-Codex and Claude Sonnet 4.6, not the GPT-6 models, so the guide gives task advice only where the docs support it and otherwise tells the developer to try the model on the website job sample. The list comes from the user and is written as team-reported.
- GitHub's docs suggest GPT-5.3-Codex for complex engineering and review. The docs' suggestion of a Terra model is not repeated, because Terra, Fable and Kimi are not available in the team's picker; the guide names only the six picker models.

## Must match the source

- The template's sections and ID scheme ([Job Behavior Template](../job-behavior-template/requirements.md#requirements)) and the one-box diagram rule. The template copy inside the skill folder must be identical to the template.

## Need not match

- A particular Copilot model's wording, or identical output between runs.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README describe the document. The job behaviors a document records carry the prefixes `CUR-` and `ASM-` and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule.
- **Document files versus records.** The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md` and `review-checklist.md` beside the deliverables are internal and are never sent to the vendor. None of this component's files is sent to the vendor; they are for our team. Only the finished specification built by Website Check Job Behavior goes to the vendor.
- **Two kinds of diagram.** The diagram in a component's README shows components. The one-box diagram inside a job document is deliverable content and follows its own rule.
- **Stale model guidance.** Model availability changes, so the guidance carries a valid-as-of date and a re-check step.
- **Output varies.** Copilot output differs between models and runs; the behaviors can be judged only on samples.
- **Two copies of the instructions.** The fallback prompt repeats the skill's instructions, and the skill folder holds a copy of the template. Both must be kept in step; the root checks the template copy.
