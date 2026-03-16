// ⚠️ SERVER-SIDE ONLY — do not import from Client Components
// sanitize.ts — XSS prevention for user-supplied text fields
//
// Uses `isomorphic-dompurify` which works in both Node and Edge environments.
// Called in task-actions.ts before writing title/description to the database.

import DOMPurify from "isomorphic-dompurify";

/**
 * Strips all HTML tags and dangerous content from user-supplied text.
 * Should be applied to every `title` and `description` field before DB writes.
 *
 * @example sanitizeText('<img src=x onerror=alert(1) />') → ''
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return "";
  // FORCE_BODY:false / ALLOWED_TAGS:[] → all HTML is stripped, only text remains
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}
