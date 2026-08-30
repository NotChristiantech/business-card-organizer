import { Contact } from './db';

export function buildVCard(contact: Contact): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
    contact.title ? `TITLE:${contact.title}` : '',
    contact.company ? `ORG:${contact.company}` : '',
    contact.email ? `EMAIL:${contact.email}` : '',
    contact.phone ? `TEL:${contact.phone}` : '',
    contact.website ? `URL:${contact.website}` : '',
    contact.address ? `ADR:;;${contact.address};;;;` : '',
    contact.notes ? `NOTE:${contact.notes.replace(/\n/g, '\\n')}` : '',
    'END:VCARD',
  ];
  return lines.filter(Boolean).join('\n');
}
