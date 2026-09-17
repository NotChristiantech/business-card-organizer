import Anthropic from '@anthropic-ai/sdk';

/** Override with CLAUDE_MODEL if you want to trade cost for quality either way. */
export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

let _client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env.local.');
  }
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Calls Claude and parses a JSON object out of the response.
 *
 * Models sometimes wrap JSON in prose or a fenced block even when told not to,
 * so we prefill the assistant turn with the opening brace and extract
 * defensively rather than trusting the raw text.
 */
export async function askForJson<T>(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const client = getClaude();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.6,
    system: opts.system,
    messages: [
      { role: 'user', content: opts.prompt },
      { role: 'assistant', content: '{' },
    ],
  });

  const block = message.content[0];
  const text = '{' + (block && block.type === 'text' ? block.text : '');
  return parseJsonObject<T>(text);
}

export function parseJsonObject<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Claude did not return JSON. Got: ' + text.slice(0, 300));
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch (err) {
    throw new Error(
      'Claude returned malformed JSON: ' + (err as Error).message + '\n' + candidate.slice(0, 500),
    );
  }
}
