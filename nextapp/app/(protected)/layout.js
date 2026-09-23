import { auth }    from '@/lib/auth.js';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/');
  return <>{children}</>;
}
