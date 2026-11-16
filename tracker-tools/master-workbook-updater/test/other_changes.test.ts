import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOtherChanges } from "../src/other_changes.ts";

const COLUMNS = ["stage", "source_note", "our_owner"];

test("[B2] the exporter's entries are read with their current value, proposed value and state", () => {
  assert.deepEqual(parseOtherChanges("", COLUMNS), { entries: [] });
  assert.deepEqual(parseOtherChanges("stage: sent -> review [update] | source_note:  -> look at the archive [add] | our_owner: Ann ->  [suggest]", COLUMNS), {
    entries: [
      { column: "stage", current: "sent", proposed: "review", state: "update" },
      { column: "source_note", current: "", proposed: "look at the archive", state: "add" },
      { column: "our_owner", current: "Ann", proposed: "", state: "suggest" },
    ],
  });
});

test("[B2] a held or conflict state is read, so the row can be listed", () => {
  assert.deepEqual(parseOtherChanges("stage: sent -> review [held]", COLUMNS), { entries: [{ column: "stage", current: "sent", proposed: "review", state: "held" }] });
});

test("[B3] an entry that cannot be read exactly is an error, never a guess", () => {
  const error = (text: string): string => (parseOtherChanges(text, COLUMNS) as { error: string }).error;
  assert.match(error("stage sent -> review"), /unreadable other_changes entry/);
  assert.match(error("stage: sent -> review"), /unreadable other_changes entry/);
  assert.match(error("nothing: sent -> review [update]"), /"nothing" is not a column of the tab/);
  assert.match(error("stage: sent -> review [maybe]"), /state "maybe" for "stage"/);
  assert.match(error("stage: sent [update]"), /exactly one "->" and one proposed value/);
  assert.match(error("stage: a -> b -> c [update]"), /exactly one "->" and one proposed value/);
  assert.match(error("stage: sent -> review [update] | review [update]"), /unreadable other_changes entry "review \[update\]"/);
});
