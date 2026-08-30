import { NextRequest, NextResponse } from 'next/server';
import { getContact, markSynced } from '@/lib/cards';
import { isGhlConfigured, syncContactToGhl } from '@/lib/ghl';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isGhlConfigured()) {
    return NextResponse.json(
      { error: 'GHL is not configured. Set GHL_PRIVATE_TOKEN and GHL_LOCATION_ID.' },
      { status: 400 }
    );
  }

  const contact = getContact(params.id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const { id } = await syncContactToGhl(contact);
    markSynced(contact.id, id);
    return NextResponse.json({ ok: true, ghlContactId: id });
  } catch (err) {
    console.error('GHL sync failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'GHL sync failed' },
      { status: 502 }
    );
  }
}
