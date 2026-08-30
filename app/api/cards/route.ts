import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { createContact, listContacts } from '@/lib/cards';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? undefined;
  return NextResponse.json(listContacts(query));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name = '',
      title = '',
      company = '',
      email = '',
      phone = '',
      website = '',
      address = '',
      notes = '',
      image, // base64, optional
      mediaType,
    } = body;

    if (!name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    let imagePath = '';
    if (image && mediaType) {
      const ext = mediaType.split('/')[1] || 'jpg';
      const filename = `${uuid()}.${ext}`;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(image, 'base64'));
      imagePath = `/uploads/${filename}`;
    }

    const contact = createContact({
      name,
      title,
      company,
      email,
      phone,
      website,
      address,
      notes,
      image_path: imagePath,
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error('create card failed', err);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
