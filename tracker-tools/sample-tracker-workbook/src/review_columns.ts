import type { Row, Table } from "../../tracker-tables/src/csv.ts";
import { dueOn, isOverdue } from "../../tracker-tables/src/working_days.ts";

export type Review = {
  due_on: string;
  review_state: string;
  days_past_original_due: number | "";
  age_awaiting_review: number | "";
};

const DAY = 86_400_000;
const time = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** Working days after `from` up to and including `to`; weekends skipped, no holidays in the sample. */
function workingDaysAfter(from: string, to: string): number {
  let count = 0;
  for (let t = time(from) + DAY; t <= time(to); t += DAY) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

/** The computed review columns of one question row at the as-of date. */
export function reviewColumns(row: Row, asOf: string): Review {
  if (row.released_on === "") return { due_on: "", review_state: "Not released", days_past_original_due: "", age_awaiting_review: "" };
  const due = dueOn(row.released_on!);
  const { status, answer_status: answer } = row;
  const overdue = isOverdue(asOf, due, answer!, status!);
  const awaiting = status === "released" && answer === "answered";
  const followUp = answer === "partially-answered" || answer === "cannot-answer";
  let state: string;
  if (awaiting) state = "Awaiting lead review";
  else if (status === "clarification-requested") state = overdue ? "Overdue, clarification requested" : "Clarification requested";
  else if (status === "released") state = followUp ? (overdue ? "Overdue, follow-up" : "Follow-up") : overdue ? "Overdue" : "Open";
  else state = status![0]!.toUpperCase() + status!.slice(1);
  return {
    due_on: due,
    review_state: state,
    days_past_original_due: overdue ? workingDaysAfter(due, asOf) : "",
    age_awaiting_review: awaiting ? Math.round((time(asOf) - time(row.answered_on!)) / DAY) : "",
  };
}

/** The references of proposals still awaiting review for one record, as the pointer shown on its row. */
export function pendingChanges(proposals: Table, tab: string, ref: string): string {
  return proposals.rows
    .filter((p) => p.tab === tab && p.record_ref === ref && p.review_status === "pending-review")
    .map((p) => p.change_ref)
    .join("; ");
}
