import { randomUUID } from 'node:crypto';
import { askForJson } from './claude';
import { getDb, nowIso } from './db';
import { voiceSpecToPrompt } from './voice';
import { withCritique } from './formatting';
import { DEFAULT_GUARDRAILS, flagSecuritiesRisk, guardrailsToPrompt } from './guardrails';
import type { Draft, DraftStatus, DraftWithContext, Format, Idea, PostStats, VoiceSpec } from './types';

const WRITE_SYSTEM = `You write LinkedIn posts that do not read like LinkedIn posts.

The voice specification you are given is a hard constraint, not a suggestion. If the spec says the author never uses a construction, you never use it, even when it would be the natural choice. Matching the author matters more than writing the objectively best post.

Banned unless the voice spec explicitly says the author uses them:
- Opening with a one-word line for drama ("Wild." / "Nobody talks about this.")
- "Here's the thing" / "Let that sink in" / "The result?" / "Game-changer" / "In today's fast-paced world"
- Rhetorical question chains. A deliberate paired "What if X? What if Y?" frame is not this, and is allowed when the voice spec says so.
- Ending with "Thoughts?" or "Agree?"
- Emoji used decoratively (as bullets, or sprinkled for tone). Emoji used as FIELD LABELS inside an event-details block — date, time, format, host — is a different thing and is allowed when the voice spec says so.
- Claiming numbers or outcomes not present in the source material
- Em dashes as a stylistic tic if the author does not use them

Other rules:
- Invent nothing. If the idea lacks a detail the format wants, write around the gap rather than fabricating. Never invent statistics, client names, or outcomes.
- Line breaks are structural on LinkedIn. Use them the way the voice spec describes.
- The first two lines are all most readers see before "see more". Earn the click without a cheap cliffhanger.
- Length should fit the format and the voice spec, not a target word count.`;

export interface GeneratedVariant {
  hook: string;
  body: string;
  format_id: string;
  self_critique: string;
}

export async function generateDrafts(opts: {
  idea: Idea;
  formats: Format[];
  voiceSpec: VoiceSpec | null;
  extraDirection?: string;
}): Promise<GeneratedVariant[]> {
  const { idea, formats, voiceSpec, extraDirection } = opts;

  const voiceBlock = voiceSpec
    ? voiceSpecToPrompt(voiceSpec)
    : 'No voice profile has been set up yet. Write in a plain, direct, specific register. Avoid all LinkedIn cliches. Short paragraphs, no hype, no emoji.';

  const formatBlock = formats
    .map(
      (f) =>
        `FORMAT ID: ${f.id}\nNAME: ${f.name}\nWHAT IT IS: ${f.description}\nSKELETON:\n${f.skeleton}\nWHEN IT WORKS: ${f.when_to_use}`,
    )
    .join('\n\n---\n\n');

  const prompt = `=== NON-NEGOTIABLE CONTENT RULES ===
These override everything else, including the voice specification and the
format skeleton. A draft that breaks one of these is useless no matter how
well written it is.

${guardrailsToPrompt(DEFAULT_GUARDRAILS)}

=== VOICE SPECIFICATION (hard constraint) ===
${voiceBlock}

=== THE IDEA ===
Title: ${idea.title}
Substance: ${idea.raw_text}
Angle: ${idea.angle ?? '(not specified)'}
Audience: ${idea.audience ?? '(not specified)'}
Source: ${idea.source}${idea.source_label ? ` (${idea.source_label})` : ''}

=== AVAILABLE FORMATS ===
${formatBlock}
${extraDirection ? `\n=== ADDITIONAL DIRECTION FROM THE AUTHOR ===\n${extraDirection}\n` : ''}
=== TASK ===
Write one post for each format listed above, pouring this idea into that format's shape. ${formats.length} posts total.

If a format genuinely does not fit this idea, still write it, but say so plainly in self_critique — the author needs to know which to discard.

Return JSON:
{
  "variants": [
    {
      "format_id": "the exact FORMAT ID this variant uses",
      "hook": "the first line of the post, repeated here on its own",
      "body": "the complete post, including the hook line, with real line breaks as \\n",
      "self_critique": "the weakest thing about this draft, stated honestly. If it fabricates or stretches anything, say exactly what."
    }
  ]
}`;

  const out = await askForJson<{ variants: GeneratedVariant[] }>({
    system: WRITE_SYSTEM,
    prompt,
    maxTokens: 8000,
    temperature: 0.85,
  });
  return out.variants ?? [];
}

export function insertDrafts(
  variants: GeneratedVariant[],
  meta: { idea_id: string; voice_profile_id: string | null },
): Draft[] {
  const db = getDb();
  const ts = nowIso();
  const stmt = db.prepare(`
    INSERT INTO drafts (id, idea_id, format_id, voice_profile_id, hook, body, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `);

  const created: Draft[] = [];
  const tx = db.transaction(() => {
    for (const v of variants) {
      const id = randomUUID();
      // The self-critique is appended so it survives with the draft; the UI
      // splits it back out rather than storing it in a column nobody queries.
      const risk = flagSecuritiesRisk(v.body);
      const note = [risk ? `COMPLIANCE FLAG: ${risk}` : null, v.self_critique || null]
        .filter(Boolean)
        .join(' ');
      const body = withCritique(v.body, note || null);
      stmt.run(id, meta.idea_id, v.format_id, meta.voice_profile_id, v.hook, body, ts, ts);
      created.push({
        id,
        idea_id: meta.idea_id,
        format_id: v.format_id,
        voice_profile_id: meta.voice_profile_id,
        hook: v.hook,
        body,
        status: 'draft',
        scheduled_for: null,
        posted_at: null,
        media: null,
        created_at: ts,
        updated_at: ts,
      });
    }
  });
  tx();
  return created;
}


const DRAFT_SELECT = `
  SELECT d.*, i.title AS idea_title, i.source AS idea_source,
         COALESCE(f.name, d.format_id) AS format_name
  FROM drafts d
  JOIN ideas i ON i.id = d.idea_id
  LEFT JOIN formats f ON f.id = d.format_id
`;

export function listDrafts(status?: DraftStatus): DraftWithContext[] {
  const db = getDb();
  const order = `ORDER BY CASE d.status WHEN 'scheduled' THEN 0 WHEN 'approved' THEN 1 WHEN 'draft' THEN 2 WHEN 'posted' THEN 3 ELSE 4 END,
                 d.scheduled_for IS NULL, d.scheduled_for ASC, d.created_at DESC`;
  const rows = status
    ? (db.prepare(`${DRAFT_SELECT} WHERE d.status = ? ${order}`).all(status) as DraftWithContext[])
    : (db.prepare(`${DRAFT_SELECT} ${order}`).all() as DraftWithContext[]);
  return rows;
}

export function listDraftsForIdea(ideaId: string): DraftWithContext[] {
  return getDb()
    .prepare(`${DRAFT_SELECT} WHERE d.idea_id = ? ORDER BY d.created_at DESC`)
    .all(ideaId) as DraftWithContext[];
}

export function getDraft(id: string): DraftWithContext | null {
  const row = getDb().prepare(`${DRAFT_SELECT} WHERE d.id = ?`).get(id) as
    | DraftWithContext
    | undefined;
  return row ?? null;
}

export function updateDraft(
  id: string,
  patch: { body?: string; hook?: string; status?: DraftStatus; scheduled_for?: string | null },
): void {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (patch.body !== undefined) {
    sets.push('body = ?');
    vals.push(patch.body);
  }
  if (patch.hook !== undefined) {
    sets.push('hook = ?');
    vals.push(patch.hook);
  }
  if (patch.scheduled_for !== undefined) {
    sets.push('scheduled_for = ?');
    vals.push(patch.scheduled_for);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    vals.push(patch.status);
    // Stamp posted_at on the transition so the performance view has a date
    // without asking the user to enter one.
    if (patch.status === 'posted') {
      sets.push('posted_at = COALESCE(posted_at, ?)');
      vals.push(nowIso());
    }
  }
  if (!sets.length) return;

  sets.push('updated_at = ?');
  vals.push(nowIso(), id);
  db.prepare(`UPDATE drafts SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function deleteDraft(id: string): void {
  getDb().prepare(`DELETE FROM drafts WHERE id = ?`).run(id);
}

export function listFormats(activeOnly = true): Format[] {
  const sql = activeOnly
    ? `SELECT * FROM formats WHERE active = 1 ORDER BY weight DESC, name ASC`
    : `SELECT * FROM formats ORDER BY weight DESC, name ASC`;
  return getDb().prepare(sql).all() as Format[];
}

export function getStatsFor(draftId: string): PostStats | null {
  return (
    (getDb().prepare(`SELECT * FROM post_stats WHERE draft_id = ?`).get(draftId) as
      | PostStats
      | undefined) ?? null
  );
}
