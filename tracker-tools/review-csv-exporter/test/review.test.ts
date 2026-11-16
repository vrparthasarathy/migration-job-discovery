import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ids, add, edit, exportReview, ok, put, review, set, setup, snapshot, text, writeProposal } from "./support.ts";

const DECISION = { review_status: "accepted", reviewer: "Rae", review_note: "ok", reviewed_on: "2026-11-21" };

test("[B05] a refresh keeps the lead's review columns and flags a reviewed row whose content changed", async () => {
  const f = await setup({ "mr-1": [set("Use Cases", ids.nightly, "vendor", "Beta Inc", "Beta"), set("Use Cases", ids.daily, "vendor", "Acme Inc", "Acme")] });
  await ok(f);
  const [first] = await review(f, "review-use-cases.csv");
  assert.deepEqual([first!.review_status, first!.reviewer, first!.review_note, first!.reviewed_on, first!.applied_on, first!.changed_since_review], ["", "", "", "", "", ""]);

  await edit(f, "review-use-cases.csv", "UC-002", DECISION);
  await ok(f);
  const same = await review(f, "review-use-cases.csv");
  assert.deepEqual(same.map((r) => [r.record, r.review_status, r.reviewer, r.review_note, r.reviewed_on, r.changed_since_review]), [["UC-001", "", "", "", "", ""], ["UC-002", "accepted", "Rae", "ok", "2026-11-21", ""]]);

  await writeProposal(f.proposals, "mr-1", [set("Use Cases", ids.nightly, "vendor", "Beta Corp", "Beta"), set("Use Cases", ids.daily, "vendor", "Acme Inc", "Acme")]);
  await ok(f);
  const changed = await review(f, "review-use-cases.csv");
  assert.deepEqual(changed.map((r) => [r.record, r.review_status, r.changed_since_review]), [["UC-001", "", ""], ["UC-002", "accepted", "yes"]]);
  assert.equal(changed[1]!["vendor (proposed)"], "Beta Corp");
  const again = await snapshot(f.out);
  await ok(f);
  assert.deepEqual(await snapshot(f.out), again, "the flag stays until the lead clears it");

  await edit(f, "review-use-cases.csv", "UC-002", { changed_since_review: "", applied_on: "2026-11-22" });
  await ok(f);
  const [, cleared] = await review(f, "review-use-cases.csv");
  assert.deepEqual([cleared!.applied_on, cleared!.changed_since_review], ["2026-11-22", ""]);

  await writeProposal(f.proposals, "mr-1", [set("Use Cases", ids.daily, "vendor", "Acme Inc", "Acme")]);
  await ok(f);
  assert.deepEqual((await review(f, "review-use-cases.csv")).map((r) => r.record), ["UC-001"], "a row that no longer appears is dropped with its review cells");
});

test("[B05] review cells of a new record are matched by its local reference", async () => {
  const f = await setup({ "mr-1": [add("Use Cases", "uc-delta-brand-new", "vendor", "Delta")] });
  await ok(f);
  await edit(f, "review-use-cases.csv", "uc-delta-brand-new", { review_status: "clarify", review_note: "who is Delta?" });
  await ok(f);
  const [row] = await review(f, "review-use-cases.csv");
  assert.deepEqual([row!.record_key, row!.review_status, row!.review_note, row!.changed_since_review], ["uc-delta-brand-new", "clarify", "who is Delta?", ""]);
});

test("[B08] a review file with an invalid status, a secret, a lost column or bad CSV stops the run and writes nothing", async () => {
  const f = await setup({ "mr-1": [set("Use Cases", ids.nightly, "vendor", "Beta Inc", "Beta")] });
  await ok(f);
  const file = join(f.out, "review-use-cases.csv");
  const good = await text(file);
  const tries: [() => Promise<void>, RegExp][] = [
    [() => edit(f, "review-use-cases.csv", "UC-002", { review_status: "maybe" }), /review-use-cases\.csv: line 2: review_status "maybe" must be blank or one of accepted, rejected, clarify/],
    [() => edit(f, "review-use-cases.csv", "UC-002", { review_note: "token=abcd1234efgh" }), /line 2: secret-looking value in "review_note"/],
    [() => put(file, good.replace("review_status", "decision")), /line 1: missing column "review_status"; the headings file changed/],
    [() => put(file, '"unterminated\n'), /line 1: .*unterminated/],
  ];
  for (const [prepare, pattern] of tries) {
    await put(file, good);
    await prepare();
    const broken = await snapshot(f.out);
    const outcome = await exportReview(f);
    assert.equal(outcome.status, 1);
    assert.match(outcome.stderr, pattern);
    assert.doesNotMatch(outcome.stderr, /abcd1234efgh/, "a secret is never echoed");
    assert.deepEqual(await snapshot(f.out), broken, "nothing is written");
  }
});
