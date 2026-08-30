import { NextRequest, NextResponse } from 'next/server';
import { getContact } from '@/lib/cards';
import { buildVCard } from '@/lib/vcard';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const contact = getContact(params.id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const vcard = buildVCard(contact);
  return new NextResponse(vcard, {
    headers: {
      'Content-Type': 'text/vcard',
      'Content-Disposition': `attachment; filename="${contact.name || 'contact'}.vcf"`,
    },
  });
}
