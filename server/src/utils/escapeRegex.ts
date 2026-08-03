/**
 * Escape regex metacharacters so user-supplied text can be embedded in a
 * RegExp / Mongo $regex as a literal string. Prevents both ReDoS payloads and
 * unintended pattern matching.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
