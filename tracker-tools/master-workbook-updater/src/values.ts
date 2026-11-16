/** A cell value compared as the tool compares them: newlines normalized and the ends trimmed. */
export const norm = (value: string): string => value.replace(/\r\n?/g, "\n").trim();
