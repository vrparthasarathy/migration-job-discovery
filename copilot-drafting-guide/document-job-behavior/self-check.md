# Self-check and question rule

Read this before returning any draft or update.

## The question rule

Ask only when both are true: the source cannot show the answer, and the answer would change what the migrated use case must do. Never ask what the source already states (a value, an address, a setting). Never ask the reason behind a behavior the source shows. When unsure whether the source shows something, it is not a current behavior: make it a question if it meets the rule, otherwise leave it out.

Only source-observed and document-described statements are current behaviors. Team analysis, inference and recommendation are questions or are left out.

## Self-check report

End the reply with a report that has these headings, in this order.

1. **Source, core files and documents not read or missing.** List each source file and each document you were given or could see but did not read, or did not read in full. List `external_tools.md` and `logic.md` by name if either was not given or not found. Write "none" if you read everything and both core files were present.
2. **Current behaviors with no scenario.** List each `B<n>` that no scenario's `covers:` line links. Write "none" if all are covered.
3. **Scenarios naming unknown IDs.** List each scenario that names a behavior ID not in the current behaviors table. Write "none" if all exist.
4. **Statements with no evidence pointer, unsupported by their evidence, or in conflict.** List each current behavior, and each operational context row with an answer other than `unknown`, whose evidence cell is empty or does not name a file and place or a document and place; each whose cited place does not show what the statement says; and each pair of statements or pieces of evidence that conflict, naming both. Write "none" if there are none.
5. **Limits.** Say that this check is best effort, not a guarantee, and that a person must review the draft against the source before it goes to the vendor.

Also check, and fix before you reply: no template part is missing or added; no curly-bracket text remains; every current behavior is source-observed or document-described; every ID kept after an update and no duplicate row added; the diagram is one box in the template's form with the behavior IDs in the edge labels as plain text and linked in the description; the acknowledgement log is untouched unless the developer gave facts.

After the report, tell the developer to run `propose-tracker-updates` next.
