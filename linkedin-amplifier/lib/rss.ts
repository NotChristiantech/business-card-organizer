/**
 * Minimal RSS 2.0 / Atom parser.
 *
 * Deliberately dependency-free: we need title, link, date and summary from
 * well-formed feeds, which is a small enough job that pulling in an XML stack
 * costs more than it saves.
 */
export interface FeedItem {
  title: string;
  link: string;
  published: string | null;
  summary: string;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#34': '"',
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    const known = ENTITIES[entity.toLowerCase()] ?? ENTITIES[entity];
    if (known) return known;
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return match;
  });
}

function stripTags(input: string): string {
  return decodeEntities(input.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Pulls the text of the first matching tag, unwrapping CDATA if present. */
function tagText(xml: string, ...tags: string[]): string {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
    const m = xml.match(re);
    if (m) {
      const cdata = m[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      return stripTags(cdata ? cdata[1] : m[1]);
    }
  }
  return '';
}

/** Atom puts the URL in an attribute rather than the element body. */
function atomLink(xml: string): string {
  const m = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? decodeEntities(m[1]) : '';
}

export function parseFeed(xml: string, limit = 15): FeedItem[] {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];
  return blocks.slice(0, limit).map((block) => {
    const link = tagText(block, 'link') || atomLink(block);
    const summary = tagText(block, 'description', 'summary', 'content');
    const published = tagText(block, 'pubDate', 'published', 'updated', 'dc:date') || null;
    return {
      title: tagText(block, 'title') || '(untitled)',
      link,
      published,
      summary: summary.slice(0, 1200),
    };
  });
}

export async function fetchFeed(url: string, limit = 15): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'linkedin-amplifier/0.1 (personal content tool)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Feed ${url} returned ${res.status}`);
  return parseFeed(await res.text(), limit);
}
