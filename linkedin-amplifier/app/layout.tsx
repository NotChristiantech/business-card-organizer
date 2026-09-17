import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { NavLinks } from '@/components/NavLinks';

export const metadata: Metadata = {
  title: 'LinkedIn Amplifier',
  description: 'Voice, ideas, drafts, queue and a real feedback loop.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              LinkedIn <span style={{ color: 'var(--accent)' }}>Amplifier</span>
            </Link>
            <NavLinks />
          </header>
          {children}
          <footer className="mt-16 border-t pt-4 text-xs muted" style={{ borderColor: 'var(--border)' }}>
            Drafts stay local. Nothing is posted automatically — you copy and publish.
          </footer>
        </div>
      </body>
    </html>
  );
}
