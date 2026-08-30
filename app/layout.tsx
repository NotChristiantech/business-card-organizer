import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Business Card Organizer',
  description: 'Capture business cards, search contacts, and sync leads into GoHighLevel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b bg-white">
            <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <Link href="/" className="text-lg font-semibold">
                📇 Card Organizer
              </Link>
              <div className="flex gap-4 text-sm font-medium text-slate-600">
                <Link href="/" className="hover:text-slate-900">
                  Capture
                </Link>
                <Link href="/contacts" className="hover:text-slate-900">
                  Contacts
                </Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
