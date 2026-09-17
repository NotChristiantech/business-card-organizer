/**
 * Pure helpers safe to import from client components.
 *
 * Kept separate from lib/drafts.ts on purpose: that module pulls in
 * better-sqlite3, which must never reach the browser bundle.
 */

/**
 * Drafts carry the model's own critique as an HTML comment appended to the
 * body, so it travels with the text through edits without a column nobody
 * queries. This splits it back apart for display.
 */
export function splitCritique(body: string): { body: string; critique: string | null } {
  const m = body.match(/\n*<!--critique:([\s\S]*?)-->\s*$/);
  if (!m) return { body, critique: null };
  return { body: body.slice(0, m.index).trimEnd(), critique: m[1].trim() };
}

export function withCritique(body: string, critique: string | null): string {
  return critique ? `${body}\n\n<!--critique:${critique}-->` : body;
}
