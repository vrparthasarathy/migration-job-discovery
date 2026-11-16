export type OtherChange = { column: string; current: string; proposed: string; state: string };
export type OtherChanges = { entries: OtherChange[] } | { error: string };

const STATES = ["add", "update", "suggest", "held", "conflict"];
const SEPARATOR = " -> ";

/**
 * Reads the exporter's `field: current -> proposed [state]` entries, joined by ` | `.
 * An entry is read only when the field is one of `columns`, the state is valid, and there is exactly one ` -> `, so a single proposed value;
 * anything else is an error naming the entry, never a guess.
 */
export function parseOtherChanges(text: string, columns: string[]): OtherChanges {
  const entries: OtherChange[] = [];
  if (text.trim() === "") return { entries };
  for (const piece of text.split(" | ")) {
    const match = /^([^:\s]+): (.*) \[([a-z]+)\]$/s.exec(piece);
    if (!match) return { error: `unreadable other_changes entry "${piece}"` };
    const [, column, body, state] = match as unknown as [string, string, string, string];
    if (!columns.includes(column)) return { error: `other_changes field "${column}" is not a column of the tab` };
    if (!STATES.includes(state)) return { error: `other_changes state "${state}" for "${column}" is not one of ${STATES.join(", ")}` };
    const parts = body.split(SEPARATOR);
    if (parts.length !== 2) return { error: `other_changes entry for "${column}" must hold exactly one "${SEPARATOR.trim()}" and one proposed value` };
    entries.push({ column, current: parts[0]!, proposed: parts[1]!, state });
  }
  return { entries };
}
