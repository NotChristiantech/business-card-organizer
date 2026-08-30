import { NextRequest, NextResponse } from 'next/server';
import { parseCardImage } from '@/lib/parseCard';

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json();
    if (!image || !mediaType) {
      return NextResponse.json({ error: 'image and mediaType are required' }, { status: 400 });
    }

    const parsed = await parseCardImage(image, mediaType);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('parse-card failed', err);
    return NextResponse.json({ error: 'Failed to parse card image' }, { status: 500 });
  }
}
