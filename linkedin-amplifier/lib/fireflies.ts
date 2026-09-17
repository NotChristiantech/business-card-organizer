/**
 * Fireflies GraphQL client.
 *
 * Only the two calls we need: list recent meetings, and fetch one transcript's
 * sentences. Set FIREFLIES_API_KEY (Fireflies -> Settings -> Developer Settings).
 * Without a key the app still works — paste a transcript into the importer.
 */
const ENDPOINT = 'https://api.fireflies.ai/graphql';

export interface FirefliesMeeting {
  id: string;
  title: string;
  date: string | null;
  duration: number | null;
}

export function firefliesConfigured(): boolean {
  return Boolean(process.env.FIREFLIES_API_KEY);
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const key = process.env.FIREFLIES_API_KEY;
  if (!key) throw new Error('FIREFLIES_API_KEY is not set.');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error('Fireflies: ' + json.errors.map((e) => e.message).join('; '));
  if (!res.ok || !json.data) throw new Error(`Fireflies request failed (${res.status}).`);
  return json.data;
}

export async function listRecentMeetings(limit = 15): Promise<FirefliesMeeting[]> {
  const data = await gql<{ transcripts: FirefliesMeeting[] }>(
    `query Recent($limit: Int) {
       transcripts(limit: $limit) { id title date duration }
     }`,
    { limit },
  );
  return data.transcripts ?? [];
}

/** Returns the transcript flattened to "Speaker: text" lines, ready for mining. */
export async function getTranscriptText(id: string): Promise<{ title: string; text: string }> {
  const data = await gql<{
    transcript: { title: string; sentences: { speaker_name: string | null; text: string }[] | null };
  }>(
    `query One($id: String!) {
       transcript(id: $id) { title sentences { speaker_name text } }
     }`,
    { id },
  );

  const t = data.transcript;
  if (!t) throw new Error('Transcript not found.');

  const text = (t.sentences ?? [])
    .map((s) => `${s.speaker_name ?? 'Speaker'}: ${s.text}`)
    .join('\n');

  return { title: t.title, text };
}
