# Requirements: Copilot Drafting Guide

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- Two client-facing files: a prompt developers paste into GitHub Copilot Chat with a job's source and the template, and a usage and model guidance file.
- The prompt makes Copilot fill in only the template's sections, label every statement with its kind, cite the file and place for each claimed behavior, write open questions instead of guessing, leave approved migration behavior and the acknowledgement blank, follow the black-box diagram rule, and say which source it did not read.
- Nothing the client receives mentions Craft or needs anything installed.
- The guidance tells developers that Copilot's output is a draft a person must review against the source before it goes to the client.
- Model advice was checked on 2026-11-14 against GitHub's [supported models](https://docs.github.com/en/copilot/reference/ai-models/supported-models) and [model comparison](https://docs.github.com/en/copilot/reference/ai-models/model-comparison) pages (read through a summarizer, truncated, no last-updated date shown). It is marked environment-dependent with a valid-as-of date and tells the reader to check the model picker, plan and administrator policy. It calls no model guaranteed.
- The client reports these models as available (not from the docs): Sonnet 5.5, GPT-6.1 Sol, Terra, Luna, GPT-5.6 Terra and GPT-5.3-Codex; Fable and Kimi are not available. The advice is written as client-reported. The exact Terra and Luna version names are an open item.
- The docs say GitHub suggests GPT-5.6 Terra for balanced work and GPT-5.3-Codex for complex engineering and review.

## Must match the source

- The template's sections and ID scheme ([Job Behavior Template](../job-behavior-template/requirements.md#requirements)) and the black-box diagram rule.

## Need not match

- A particular Copilot model's wording, or identical output between runs.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README describe the document. The job behaviors a document records carry the prefixes `CUR-`, `ASM-`, `CHG-` and `MIG-` and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule.
- **Client files versus records.** The `README.md`, `craft.json` and `tasks.md` beside the deliverables are framework records and are never sent to the client. Copying the client-facing files out is a manual step.
- **Two kinds of diagram.** The diagram in a component's README shows components. The black-box diagram inside a job document is deliverable content and follows its own rule.
- **Stale model guidance.** Model availability changes, so the guidance carries a valid-as-of date and a re-check step.
- **Output varies.** Copilot output differs between models and runs; the behaviors can be judged only on samples.
