# Subagent Smoke Test

## Purpose

Two prompts a developer pastes into Copilot Chat (agent mode) in the client environment to find out whether subagents run, whether their context is isolated, and whether a subagent can use an installed skill. They back the batch discovery idea: one subagent per use case folder.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Subagent Smoke Test**

- [Design](#design)
- [Behavior](#behavior)
- [Links](#links)

## Design

Plain Markdown, no code. Each test file holds one prompt to copy and a table that says how to read the reply. Run test 1 first. Run test 2 only if test 1 says subagents work. Both tests write nothing, so they are safe in any workspace. Test 2 assumes `document-job-behavior` is installed in the workspace; if it is not, install it from [copilot-drafting-guide](../copilot-drafting-guide/document-job-behavior/SKILL.md) or pick another installed skill and replace the three canary questions with facts from that skill.

## Behavior

- **B01** When test 1 runs, then the reply says whether a subagent tool exists, shows three separate subagent replies, and says whether the main agent saw its own secret word leak into a subagent.
- **B02** When test 2 runs, then a subagent reads the installed `document-job-behavior` skill and answers three facts that can only come from the skill's files, and the reply says whether the subagent loaded the skill itself.
- **B03** When either test cannot be done (no subagent tool, no file access, no skill), then the reply says so plainly and does not simulate the result.

## Links

- [Test 1: subagent basics](test-1-subagent-basics.md)
- [Test 2: subagent with a skill](test-2-subagent-skill.md)
