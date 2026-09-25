export const runtime = 'nodejs';

import { auth }      from '@/lib/auth.js';
import { prisma }    from '@/lib/prisma.js';
import { redirect }  from 'next/navigation';
import ProfileForm   from '@/components/ProfileForm.js';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/');

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
