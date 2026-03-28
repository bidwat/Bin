import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { Sidebar } from '@/components/Sidebar';
import { UserProvider } from '@/context/UserContext';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <UserProvider
      value={{
        id: session.user.id,
        email: session.user.email ?? null,
      }}
    >
      <main className="min-h-screen px-6 py-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Sidebar />
          <section className="rounded-[2rem] border border-white/80 bg-white/55 p-6 shadow-[0_24px_100px_rgba(15,23,42,0.06)] backdrop-blur">
            {children}
          </section>
        </div>
      </main>
    </UserProvider>
  );
}
