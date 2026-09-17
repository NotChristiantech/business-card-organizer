export type IdeaSource = 'manual' | 'fireflies' | 'rss';
export type IdeaStatus = 'new' | 'developed' | 'archived';
export type DraftStatus = 'draft' | 'approved' | 'scheduled' | 'posted' | 'discarded';

/**
 * The voice spec is the whole point of the app: a structured, hand-editable
 * description of how you write, so generation is constrained by something
 * concrete instead of "write like a thought leader."
 */
export interface VoiceSpec {
  summary: string;
  tone: string[];
  sentenceRhythm: string;
  vocabulary: { favors: string[]; avoids: string[] };
  hookPatterns: string[];
  structuralHabits: string[];
  pointOfView: string;
  formatting: string;
  neverDo: string[];
}

export interface VoiceProfile {
  id: string;
  name: string;
  spec: VoiceSpec;
  sample_posts: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  source: IdeaSource;
  source_ref: string | null;
  source_label: string | null;
  title: string;
  raw_text: string;
  angle: string | null;
  audience: string | null;
  score: number | null;
  score_reason: string | null;
  status: IdeaStatus;
  created_at: string;
}

export interface Format {
  id: string;
  name: string;
  description: string;
  skeleton: string;
  when_to_use: string;
  tags: string;
  weight: number;
  active: number;
}

export interface Draft {
  id: string;
  idea_id: string;
  format_id: string;
  voice_profile_id: string | null;
  hook: string;
  body: string;
  status: DraftStatus;
  scheduled_for: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A draft joined with the context needed to display it usefully. */
export interface DraftWithContext extends Draft {
  idea_title: string;
  idea_source: IdeaSource;
  format_name: string;
  stats?: PostStats | null;
}

export interface PostStats {
  id: string;
  draft_id: string;
  impressions: number;
  reactions: number;
  comments: number;
  reposts: number;
  profile_views: number;
  inbound_conversations: number;
  notes: string | null;
  recorded_at: string;
}

export interface FeedSource {
  id: string;
  kind: 'rss';
  url: string;
  label: string;
  last_fetched_at: string | null;
  active: number;
}
