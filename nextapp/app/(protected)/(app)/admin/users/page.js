import { auth }    from '@/lib/auth.js';
import { redirect } from 'next/navigation';
import AdminUsers   from '@/components/AdminUsers.js';

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard');
  return <AdminUsers />;
}
