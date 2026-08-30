import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { createContact } from '@/lib/cards';
import { parseCardImage } from '@/lib/parseCard';

/**
 * Unattended ingest for automations (e.g. a Make.com scenario watching a
 * Google Drive folder). No human reviews the OCR result before it's saved,
 * so contacts land tagged source="google-drive" instead of being synced to
 * GHL automatically — review/sync stays a manual step from the Contacts list.
 */
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.DRIVE_INGEST_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'DRIVE_INGEST_SECRET is not configured on the server.' },
      { status: 503 }
    );
  }

  const providedSecret = req.headers.get('x-ingest-secret');
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { image, mediaType } = await req.json();
    if (!image || !mediaType) {
      return NextResponse.json({ error: 'image and mediaType are required' }, { status: 400 });
    }

    const parsed = await parseCardImage(image, mediaType);

    const ext = mediaType.split('/')[1] || 'jpg';
    const filename = `${uuid()}.${ext}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(image, 'base64'));

    const contact = createContact({
      ...parsed,
      name: parsed.name || 'Unnamed contact (from Drive)',
      image_path: `/uploads/${filename}`,
      source: 'google-drive',
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error('from-drive ingest failed', err);
    return NextResponse.json({ error: 'Failed to process card image' }, { status: 500 });
  }
}
