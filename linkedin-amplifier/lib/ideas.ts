import { randomUUID } from 'node:crypto';
import { askForJson } from './claude';
import { getDb, nowIso } from './db';
import type { Idea, IdeaSource, IdeaStatus, VoiceSpec } from './types';
import type { FeedItem } from './rss';

export interface MinedIdea {
  title: string;
  raw_text: string;
  angle: string;
  audience: string;
  score: number;
  score_reason: string;
}

const MINING_SYSTEM = `You find the posts hiding inside raw material.

You are ruthless about quality. Most of any transcript or article is not worth posting about, and returning fewer strong ideas beats padding the list. A good idea has a specific claim attached to it — something the author knows or has seen that a reader could disagree with. "Thoughts on AI in sales" is not an idea. "Prospects who ask about integrations first close 2x slower, and here's why" is.

Reject:
- Generic observations anyone in the industry could make
- Anything that needs confidential client detail to be interesting
- Pure summary with no point of view
- Topics with no specific claim or story attached

Score 1-10 on: does this give a reader something they did not have before, and does the author have standing to say it?

Two hard rules on what you record, because ideas become published posts:
- Strip every identifying detail about clients, participants and counterparties. No names, no company names, no detail specific enough to identify someone.
- Never record the financial terms of an investment offering (rates, yields, returns, term lengths, minimums) as part of an idea, even if the source states them. An idea may be about explaining how an instrument works; it may never be about what it pays.`;

/** Mines a meeting transcript for moments the author already explained well. */
export async function mineTranscript(opts: {
  title: string;
  transcript: string;
  expertise?: string;
}): Promise<MinedIdea[]> {
  const truncated = opts.transcript.slice(0, 120_000);
  const prompt = `This is a transcript of a real business meeting or sales call titled "${opts.title}".
${opts.expertise ? `\nThe person posting is an expert in: ${opts.expertise}\n` : ''}
Find the moments worth turning into LinkedIn posts. Look specifically for:
- An explanation the author gave that landed well and would help a wider audience
- An objection or concern the other party raised, and how it was handled
- A decision made with a non-obvious rationale
- A surprising thing the other party said about their situation
- A framework, analogy or rule of thumb the author used spontaneously

For each, capture enough of the substance that a post could be written from the idea alone, WITHOUT any identifying detail about the other party. Never include company names, people's names, or figures specific enough to identify the client.

TRANSCRIPT:
${truncated}

Return JSON:
{
  "ideas": [
    {
      "title": "short handle for this idea",
      "raw_text": "the substance: what was said, the claim, the story beats, the reasoning. 3-6 sentences. Anonymised.",
      "angle": "the specific claim or point of view the post would make",
      "audience": "who specifically this is for",
      "score": 7,
      "score_reason": "one line on why this scores where it does"
    }
  ]
}

Return between 0 and 6 ideas. Zero is a valid and often correct answer.`;

  const out = await askForJson<{ ideas: MinedIdea[] }>({
    system: MINING_SYSTEM,
    prompt,
    maxTokens: 4000,
    temperature: 0.5,
  });
  return out.ideas ?? [];
}

/** Turns feed headlines into reaction-worthy angles, discarding the rest. */
export async function mineFeedItems(opts: {
  items: FeedItem[];
  expertise?: string;
}): Promise<MinedIdea[]> {
  const rendered = opts.items
    .map((i, n) => `[${n + 1}] ${i.title}\n${i.published ?? ''}\n${i.summary}\n${i.link}`)
    .join('\n\n');

  const prompt = `These are recent industry headlines.
${opts.expertise ? `\nThe person posting is an expert in: ${opts.expertise}\n` : ''}
For each one worth reacting to, identify the angle THIS person could take that most commentators would not. A headline is only worth posting about if there is a second-order consequence, a contrarian read, or a connection to the author's direct experience. Skip anything where the only available post is "here is some news."

HEADLINES:
${rendered}

Return JSON:
{
  "ideas": [
    {
      "title": "short handle",
      "raw_text": "the news in one or two lines, then the specific angle and what supports it",
      "angle": "the distinct point of view",
      "audience": "who this is for",
      "score": 6,
      "score_reason": "why"
    }
  ]
}

Return only genuinely post-worthy items. Zero is valid.`;

  const out = await askForJson<{ ideas: MinedIdea[] }>({
    system: MINING_SYSTEM,
    prompt,
    maxTokens: 3000,
    temperature: 0.6,
  });
  return out.ideas ?? [];
}

/** Develops a one-line thought into a scored, postable idea. */
export async function developManualIdea(opts: {
  note: string;
  expertise?: string;
  voice?: VoiceSpec;
}): Promise<MinedIdea> {
  const prompt = `Someone captured this raw thought to post about later:

"${opts.note}"
${opts.expertise ? `\nThey are an expert in: ${opts.expertise}` : ''}

Sharpen it into a postable idea. Find the specific claim inside the thought — the thing a reader could actually disagree with. If the thought is vague, make it concrete in the most likely direction and say so in score_reason.

Return JSON:
{
  "title": "short handle",
  "raw_text": "the developed substance, 3-6 sentences",
  "angle": "the specific claim",
  "audience": "who this is for",
  "score": 6,
  "score_reason": "why it scores there, and any assumption you made"
}`;

  return askForJson<MinedIdea>({
    system: MINING_SYSTEM,
    prompt,
    maxTokens: 1500,
    temperature: 0.6,
  });
}

export function insertIdeas(
  mined: MinedIdea[],
  meta: { source: IdeaSource; source_ref?: string | null; source_label?: string | null },
): Idea[] {
  const db = getDb();
  const ts = nowIso();
  const stmt = db.prepare(`
    INSERT INTO ideas (id, source, source_ref, source_label, title, raw_text, angle, audience, score, score_reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
  `);

  const created: Idea[] = [];
  const tx = db.transaction(() => {
    for (const m of mined) {
      const id = randomUUID();
      stmt.run(
        id,
        meta.source,
        meta.source_ref ?? null,
        meta.source_label ?? null,
        m.title,
        m.raw_text,
        m.angle ?? null,
        m.audience ?? null,
        Math.round(m.score ?? 5),
        m.score_reason ?? null,
        ts,
      );
      created.push({
        id,
        source: meta.source,
        source_ref: meta.source_ref ?? null,
        source_label: meta.source_label ?? null,
        title: m.title,
        raw_text: m.raw_text,
        angle: m.angle ?? null,
        audience: m.audience ?? null,
        score: Math.round(m.score ?? 5),
        score_reason: m.score_reason ?? null,
        status: 'new',
        created_at: ts,
      });
    }
  });
  tx();
  return created;
}

export function listIdeas(status?: IdeaStatus): Idea[] {
  const db = getDb();
  const sql = status
    ? `SELECT * FROM ideas WHERE status = ? ORDER BY score DESC, created_at DESC`
    : `SELECT * FROM ideas ORDER BY status = 'archived', score DESC, created_at DESC`;
  return (status ? db.prepare(sql).all(status) : db.prepare(sql).all()) as Idea[];
}

export function getIdea(id: string): Idea | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM ideas WHERE id = ?`).get(id) as Idea | undefined) ?? null;
}

export function updateIdeaStatus(id: string, status: IdeaStatus): void {
  getDb().prepare(`UPDATE ideas SET status = ? WHERE id = ?`).run(status, id);
}

export function deleteIdea(id: string): void {
  getDb().prepare(`DELETE FROM ideas WHERE id = ?`).run(id);
}
