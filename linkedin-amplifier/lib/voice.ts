import { askForJson } from './claude';
import { getDb, nowIso } from './db';
import type { VoiceProfile, VoiceSpec } from './types';

const EXTRACT_SYSTEM = `You analyse writing samples and produce a precise, usable description of the author's voice.

You are not a flatterer and not a marketer. You are closer to a forensic linguist. Your output will be fed to a writing model as a constraint, so vague adjectives are worthless — "professional and engaging" tells the model nothing. Every field must be specific enough that two different writers could not both satisfy it.

Rules:
- Quote or closely paraphrase actual patterns from the samples.
- Note quirks: punctuation habits, paragraph length, whether they use line breaks as beats, how they open, how they close, whether they ask questions.
- "avoids" and "neverDo" matter as much as the positive traits. If the author never uses emoji, never says "game-changer", never ends with "Thoughts?" — record that.
- If the samples are too few or too inconsistent to support a claim, say so in that field rather than inventing one.`;

export async function extractVoiceSpec(samplePosts: string): Promise<VoiceSpec> {
  const prompt = `Here are writing samples from one author. Each sample is separated by a line of dashes.

${samplePosts}

---END OF SAMPLES---

Return a JSON object with exactly these keys:
{
  "summary": "2-3 sentences describing how this person writes, specific enough to be recognisable",
  "tone": ["3-6 specific tonal descriptors, not generic ones"],
  "sentenceRhythm": "how sentences and paragraphs are constructed and paced, with observed detail",
  "vocabulary": {
    "favors": ["words, phrases and constructions this author actually reaches for"],
    "avoids": ["words and constructions conspicuously absent, including common LinkedIn cliches they never use"]
  },
  "hookPatterns": ["how their opening lines work, as reusable patterns, with a real example each"],
  "structuralHabits": ["how they organise a post: length, line breaks, lists, where the payoff lands"],
  "pointOfView": "who they address, how much first person, their stance toward the reader",
  "formatting": "observed formatting habits: line break frequency, emoji use or absence, hashtags, capitalisation",
  "neverDo": ["things that would immediately read as not-this-person"]
}`;

  return askForJson<VoiceSpec>({ system: EXTRACT_SYSTEM, prompt, maxTokens: 3000, temperature: 0.3 });
}

/** Renders the spec into the block of instruction text the generator prompt embeds. */
export function voiceSpecToPrompt(spec: VoiceSpec): string {
  const lines = [
    `VOICE SUMMARY: ${spec.summary}`,
    `TONE: ${spec.tone.join(', ')}`,
    `SENTENCE RHYTHM: ${spec.sentenceRhythm}`,
    `POINT OF VIEW: ${spec.pointOfView}`,
    `FORMATTING: ${spec.formatting}`,
    `WORDS AND PHRASES THIS AUTHOR USES: ${spec.vocabulary.favors.join('; ')}`,
    `WORDS AND PHRASES THIS AUTHOR NEVER USES: ${spec.vocabulary.avoids.join('; ')}`,
    `HOOK PATTERNS:\n${spec.hookPatterns.map((h) => `  - ${h}`).join('\n')}`,
    `STRUCTURAL HABITS:\n${spec.structuralHabits.map((h) => `  - ${h}`).join('\n')}`,
    `NEVER DO:\n${spec.neverDo.map((h) => `  - ${h}`).join('\n')}`,
  ];
  return lines.join('\n\n');
}

export function getActiveVoice(): VoiceProfile | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM voice_profiles WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1`)
    .get() as (Omit<VoiceProfile, 'spec'> & { spec: string }) | undefined;
  if (!row) return null;
  return { ...row, spec: JSON.parse(row.spec) as VoiceSpec };
}

export function listVoices(): VoiceProfile[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM voice_profiles ORDER BY is_active DESC, updated_at DESC`)
    .all() as (Omit<VoiceProfile, 'spec'> & { spec: string })[];
  return rows.map((r) => ({ ...r, spec: JSON.parse(r.spec) as VoiceSpec }));
}

export function saveVoice(input: {
  id: string;
  name: string;
  spec: VoiceSpec;
  sample_posts: string;
  makeActive: boolean;
}): VoiceProfile {
  const db = getDb();
  const ts = nowIso();
  const existing = db.prepare(`SELECT id FROM voice_profiles WHERE id = ?`).get(input.id);

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare(
        `UPDATE voice_profiles SET name = ?, spec = ?, sample_posts = ?, updated_at = ? WHERE id = ?`,
      ).run(input.name, JSON.stringify(input.spec), input.sample_posts, ts, input.id);
    } else {
      db.prepare(
        `INSERT INTO voice_profiles (id, name, spec, sample_posts, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ).run(input.id, input.name, JSON.stringify(input.spec), input.sample_posts, ts, ts);
    }
    if (input.makeActive) {
      db.prepare(`UPDATE voice_profiles SET is_active = 0`).run();
      db.prepare(`UPDATE voice_profiles SET is_active = 1 WHERE id = ?`).run(input.id);
    }
  });
  tx();

  const row = db.prepare(`SELECT * FROM voice_profiles WHERE id = ?`).get(input.id) as Omit<
    VoiceProfile,
    'spec'
  > & { spec: string };
  return { ...row, spec: JSON.parse(row.spec) as VoiceSpec };
}
