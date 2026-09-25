import { auth }    from '@/lib/auth.js';
import { redirect } from 'next/navigation';
import AppShell     from '@/components/AppShell.js';

export default async function AppLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/');

  return (
    <AppShell
      role={session.user.role}
      name={session.user.name ?? null}
      email={session.user.email ?? null}
    >
      {children}
    </AppShell>
  );
}
