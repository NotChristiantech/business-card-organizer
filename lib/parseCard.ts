import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ParsedCard {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
}

const EMPTY: ParsedCard = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  notes: '',
};

/**
 * Sends a business card photo to Claude's vision API and asks for structured
 * fields back. Keeps the app from needing a second OCR vendor/API key.
 */
export async function parseCardImage(base64Image: string, mediaType: string): Promise<ParsedCard> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `This is a photo of a business card. Extract the contact's details and reply with ONLY a JSON object (no markdown fences, no commentary) with exactly these keys: name, title, company, email, phone, website, address, notes. Use an empty string for any field you can't find. Put anything on the card that doesn't fit those fields (taglines, secondary numbers, social handles) into "notes".`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return EMPTY;

  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}
