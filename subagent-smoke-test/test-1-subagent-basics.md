# Test 1: subagent basics

Paste the prompt into Copilot Chat in agent mode, in the workspace where the skills are installed.

## Prompt

```text
I am testing whether you can run subagents. Do not skip any step, and do not simulate the subagents yourself in this conversation.

Step 1. Tell me whether you have a subagent tool available (for example runSubagent). Name the tool exactly. If you have none, say "NO SUBAGENT TOOL" and stop.

Step 2. Start three separate subagents, one after another. Give each one only its own instruction below, and nothing else from this conversation.

Subagent A: "Reply with exactly: A-DONE. Then say which tools you have available, as a plain list. Do not read any file."
Subagent B: "Reply with exactly: B-DONE. Then tell me whether you can see the word BANANA anywhere in your instructions or context. Answer yes or no."
Subagent C: "List the folder names directly under the workspace root (top level only, do not open any file). Reply with C-DONE followed by the list."

Before starting any of them, remember this secret word: BANANA. Do not put it in any subagent instruction.

Step 3. Report to me, per subagent: its exact reply, and whether it was a real separate run or whether you answered it yourself.

Step 4. Then tell me:
- Did subagent B say it could see BANANA? (Yes would mean context is not isolated.)
- Did subagent A list a tool for reading skills or files? (This shows what a subagent can use.)
- Were the three runs sequential or parallel, if you can tell?

Finish with one line: "SUBAGENTS WORK", "SUBAGENTS PARTIAL" or "SUBAGENTS DO NOT WORK", and the reason.
```

## How to read the result

| Result | Meaning |
| --- | --- |
| `NO SUBAGENT TOOL` | The feature is off or missing. Check the VS Code and Copilot versions and any organisation policy. |
| A, B and C each give their own marker and B says no | Subagents work and their context is isolated. |
| B says yes | The subagent shares the main context. Isolation is not real. |
| C cannot list folders | Subagents have no file access in this client, which blocks per-folder workers. |
| Replies look written in one go and the chat shows no subagent step | The model simulated them. Look for a visible subagent tool call and rerun if there is none. |

Record the date, VS Code version, Copilot version, model and the one-line verdict.
