import { test } from "node:test";
import assert from "node:assert/strict";
import { useCaseId } from "../src/use_case_id.ts";

test("[B11] the contract example gives the documented ID", () => {
  assert.equal(
    useCaseId("Example Vendor", "Website Availability Check"),
    "uc-example-vendor-website-availability-check",
  );
});

test("[B11] punctuation, accents and repeated separators collapse to one hyphen", () => {
  assert.equal(useCaseId("Acme, Inc.", "Café  --  Menu/Order"), "uc-acme-inc-caf-menu-order");
});

test("[B11] leading and trailing separators are trimmed", () => {
  assert.equal(useCaseId("  --Acme--  ", "!!Check!!"), "uc-acme-check");
});

test("[B11] the same inputs give the same ID", () => {
  assert.equal(useCaseId("Acme", "Check"), "uc-acme-check");
  assert.equal(useCaseId("Acme", "Check"), useCaseId("Acme", "Check"));
});

test("[B11] two vendors with one use case name give different IDs", () => {
  assert.notEqual(useCaseId("Acme", "Check"), useCaseId("Beta", "Check"));
});

test("[B11] an empty or all-symbol vendor gives no ID", () => {
  assert.equal(useCaseId("", "Check"), undefined);
  assert.equal(useCaseId("  ?! ", "Check"), undefined);
});

test("[B11] an empty or all-symbol name gives no ID", () => {
  assert.equal(useCaseId("Acme", ""), undefined);
  assert.equal(useCaseId("Acme", "***"), undefined);
});
