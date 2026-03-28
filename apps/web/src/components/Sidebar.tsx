'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useUserContext } from '@/context/UserContext';

const primaryLinks = [
  { href: '/feed', label: 'Feed', disabled: false },
  { href: '/search', label: 'Search', disabled: true },
  { href: '/collections', label: 'Collections', disabled: true },
  { href: '/settings', label: 'Settings', disabled: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserContext();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex w-full max-w-xs flex-col gap-8 rounded-[2rem] border border-black/10 bg-white/75 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:min-h-[calc(100vh-4rem)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
          Bin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Mental inbox
        </h1>
        <p className="text-sm text-slate-600">
          Signed in as {user.email ?? 'unknown user'}
        </p>
      </div>

      <nav className="space-y-2">
        {primaryLinks.map((link) =>
          link.disabled ? (
            <span
              key={link.href}
              className="flex rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-400"
            >
              {link.label}
            </span>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`flex rounded-2xl px-4 py-3 text-sm font-medium transition ${
                pathname === link.href
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>

      <div className="mt-auto rounded-2xl bg-gradient-to-br from-amber-100 via-orange-50 to-white p-4">
        <p className="text-sm font-medium text-slate-900">
          Capture first. Organize later.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Search and collections are stubbed for later phases.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
