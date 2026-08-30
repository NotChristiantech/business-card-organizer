import { NextRequest, NextResponse } from 'next/server';
import { deleteContact, getContact, updateContact } from '@/lib/cards';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const contact = getContact(params.id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const fields = await req.json();
  const updated = updateContact(params.id, fields);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  deleteContact(params.id);
  return NextResponse.json({ ok: true });
}
