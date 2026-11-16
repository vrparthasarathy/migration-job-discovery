# Test 2: subagent with a skill

Run test 1 first. Run this only if test 1 says subagents work. Do not read the skill yourself before running it; the point is that the subagent reads it.

## Prompt

```text
I am testing whether a subagent can use an installed skill. Do not answer the questions yourself and do not read any skill file in this conversation. Write and change no file.

Start one subagent. Give it only this instruction and nothing else from this conversation:

"Use the installed skill named document-job-behavior. Find its SKILL.md in this workspace (the folder is named document-job-behavior), read it, and answer these three questions from what you read. Do not draft any document and do not write any file.
1. What is the first sentence of the skill's description line, copied exactly?
2. What does the skill do when a developer gives an additional document with no tag?
3. What is the file name of the self-check rules that the skill says to read before returning a draft?
Start your reply with SKILL-READ, then the three answers, then one line saying how you found the skill: by loading it as a skill, or by searching and opening the file."

When the subagent replies, show me its reply exactly. Then say whether you started a real subagent or answered yourself. If you cannot start a subagent, or the subagent cannot find or read the skill, say "FAILED" and why. Do not guess the answers.
```

## How to read the result

The three canary answers come only from the skill's files.

| Question | Correct answer |
| --- | --- |
| 1 | "Creates, drafts, updates and versions a use case behavior document from the use case's source code, the core files external_tools.md and logic.md, tagged additional documents and any findings, questions, corrections and dependency observations the developer supplies, using the template in this folder." The first sentence is that whole sentence. |
| 2 | It treats the document as team analysis and says so in its reply. |
| 3 | `self-check.md` |

| Result | Meaning |
| --- | --- |
| All three correct, found "by loading it as a skill" | Subagents can invoke skills. Best case for the batch design. |
| All three correct, found "by searching and opening the file" | Subagents can read files but not load skills. The batch worker prompt must name the skill file path. Workable. |
| Answers wrong or vague | The subagent did not read the skill, or the main agent answered. Rerun and check for a visible subagent step. |
| `FAILED`: no file access or skill not found | Subagents cannot reach the skill in this client. The per-folder worker design needs another route. |

Record the date, VS Code version, Copilot version, model and the verdict.
