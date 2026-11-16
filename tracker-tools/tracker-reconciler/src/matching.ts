/** Similarity between question texts: deterministic normalized-text and token-overlap matching. */

/** A pair scoring at or above this is listed as a link suggestion; below it nothing is suggested. */
export const SUGGEST_THRESHOLD = 0.5;
/** A suggestion at or above this is `likely`; one between the two thresholds is `uncertain-review`. */
export const CONFIDENT_THRESHOLD = 0.8;

const STOP_WORDS = new Set(["a", "an", "the", "of", "to", "in", "on", "for", "and", "or", "is", "are", "be", "it", "that", "this", "with", "as", "by", "at", "do", "does"]);

export type Candidate = { ref: string; text: string };
export type Match = { ref: string; score: number; review: "likely" | "uncertain-review" };

export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokens(text: string): string[] {
  return [...new Set(normalize(text).split(" "))].filter((t) => t !== "" && !STOP_WORDS.has(t)).sort();
}

/** Score between 0 and 1: 1 for equal normalized text, otherwise the Jaccard overlap of the token sets. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  if (na !== "" && na === normalize(b)) return 1;
  const ta = tokens(a);
  const tb = new Set(tokens(b));
  const shared = ta.filter((t) => tb.has(t)).length;
  return shared === 0 ? 0 : Math.round((shared / (ta.length + tb.size - shared)) * 100) / 100;
}

export function findSimilar(text: string, candidates: Candidate[]): Match[] {
  const matches: Match[] = [];
  for (const candidate of candidates) {
    const score = similarity(text, candidate.text);
    if (score >= SUGGEST_THRESHOLD) {
      matches.push({ ref: candidate.ref, score, review: score >= CONFIDENT_THRESHOLD ? "likely" : "uncertain-review" });
    }
  }
  return matches.sort((x, y) => y.score - x.score);
}
