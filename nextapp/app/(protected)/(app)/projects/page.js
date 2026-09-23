export const runtime = 'nodejs';

import Link          from 'next/link';
import { auth }      from '@/lib/auth.js';
import { prisma }    from '@/lib/prisma.js';
import { redirect }  from 'next/navigation';

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect('/');

  const where = session.user.role === 'ADMIN' ? {} : { userId: session.user.id };
  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { slug: true, name: true, createdAt: true },
  });

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes projets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {session.user.role === 'ADMIN' ? 'Tous les projets (vue admin).' : 'Vos cas pilotes personnels.'}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm bg-eg-mid text-white px-4 py-2 rounded-lg font-semibold hover:bg-eg-muted transition-colors shadow-sm"
        >
          + Nouveau projet
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          <p className="text-3xl mb-3">📋</p>
          <p>Aucun projet. Créez votre premier cas pilote.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map(({ slug, createdAt }) => (
            <li key={slug}>
              <Link
                href={`/projects/${slug}`}
                className="flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200 rounded-xl hover:border-eg-mid hover:shadow-sm transition-all group"
              >
                <div>
                  <span className="text-sm font-semibold text-gray-800 group-hover:text-eg-dark">{slug}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {new Date(createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-eg-mid transition-colors">Voir →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
