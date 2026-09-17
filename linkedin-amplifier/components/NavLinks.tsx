'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/ideas', label: 'Ideas' },
  { href: '/drafts', label: 'Drafts' },
  { href: '/queue', label: 'Queue' },
  { href: '/performance', label: 'Performance' },
  { href: '/voice', label: 'Voice' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-1.5 transition-colors"
            style={{
              background: active ? 'var(--panel-2)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--muted)',
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
