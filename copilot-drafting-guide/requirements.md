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

## Testing policy and earlier-version evidence

Testing policy (user decision, 2026-11-15): a revised skill or guide does not require a fresh Copilot dry run on the website reference. The user tests each skill manually in the client environment on real jobs or use cases, gives feedback in ChatGPT, and the skill is iterated. Reported results are recorded as user-reported evidence labelled with the version they cover, and no pass is claimed for a revised version until the user reports one. The file-reading review checklist still applies. Code-tool tests (`tracker-tools` and the root integration test) are not waived.

### Earlier-version evidence (user-reported)

Recorded 2026-11-15 from the user's report in chat. It is the user's summary, not raw output, and it covers the earlier version of the skill (before the planned use-case revision). No result below is a pass for the revised version, and none ticks a checklist item.

- Environment as reported: VS Code 1.144.0, Copilot Agent mode, model "Sonnet 5.5 High".
- The IDs are this component's checklist IDs (`[B01]` to `[B10]` in `review-checklist.md`), not the root's integration behavior IDs (`B01` to `B07` in the root README).

| Checklist item | Reported result (earlier version) |
| --- | --- |
| B01 | partial |
| B02 | pass |
| B03 | partial |
| B04 | partial |
| B05 | pass |
| B06 | untested |
| Vendor-document handling | untested (the user gave no checklist ID for it) |

B07 to B10 are not part of this report; they keep their earlier file-review state.

Missing raw evidence (not in hand; none is invented here): the run date; the version or commit of the skill that was run; the job source and any vendor document used; the prompts, transcript and drafted output; the self-check report text; what made B01, B03 and B04 partial; and the written ChatGPT feedback itself, of which only the topic names below are known.

### Additional feedback, compared with the current documents

The user first sent these topics here on 2026-11-15 after discussing them in ChatGPT. Only the topic names are known, so each row records what the current documents say and not what the feedback says.

| Topic | What the current documents say | Status |
| --- | --- | --- |
| Semantic evidence adequacy | Self-check item 4 (`self-check.md`) and the question rule check that an evidence cell is non-empty and names a file and place. Nothing checks that the cited place supports the statement. | Not covered |
| Diagram edges | One black box with behavior IDs as plain text in the edge labels and linked in the description (`SKILL.md`, the template contract, B04). B04 was reported partial; the failing detail was not supplied. | Rule exists; reported partial |
| Abstraction levels | The only rule is plain business language for behaviors and scenarios (`SKILL.md`, `filling-guide.md`). No rule sets the level of detail of a behavior or of the diagram. | Not covered |
| Retries versus delivery | The reference specification lists retries and repeated alerts among the things its source cannot show (the reference component's B03) and separates an alert request "handed over" from "undelivered". The drafting skill has no general rule on this. | Reference only; not in the skill |
| Timestamps | The reference specification says the alert request carries the time in UTC. The skill only says never to invent a date for the header. No rule covers timestamps in evidence or behaviors. | Not covered in the skill |
| Source revisions | The header and the acknowledgement log carry the source revision and script link; the skill fills them only from visible facts, otherwise `unknown`, and adds the revision when the source changes. Nothing checks that the stated revision matches the evidence that was read. | Partly covered |
| Newline normalization | The tracker contract fixes CSV files to UTF-8 with LF line ends. No other document states a rule, and the byte-for-byte template copy rule does not mention line endings. | Covered for CSV only |

These topics are recorded as evidence and are not planned changes: no behavior is added (the component is at the ten-behavior cap), and the behavior lists were confirmed by the user on 2026-11-16 as planned wording, which is not a pass of any test. Whether the skill changes for them is for the user's manual testing and ChatGPT iteration to decide.

## Planned revision (use case wording)

Planned on 2026-11-15 after the user's alignment; the lines and the reasons are in this component's README `## Plan` and the [root requirements](../requirements.md#requirements). `use case` names the business unit, `job` or `script` names only the vendor's script, the question rule reads `what the migrated use case must do`, the heading reads `Use Case Behavior`, and no vendor-readable text mentions workflows or grouping. Structure, IDs and anchors do not change.

Further planned wording (2026-11-15, the user's component review): the core inputs (`external_tools.md`, `logic.md`), manually tagged documents and supplied findings are accepted as they are; four evidence kinds are kept apart and evidence is checked for support, with conflicts flagged and not guessed; existing analyses are starting inputs and not approved baselines; an update keeps IDs and history, avoids duplicates and creates a behavior only when an answer establishes one. These are in this component's README `## Plan`. They do not replace the earlier-version evidence above, and no result there is a pass for the revised version.
