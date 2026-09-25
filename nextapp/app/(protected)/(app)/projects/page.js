export const runtime = 'nodejs';

import Link           from 'next/link';
import { auth }       from '@/lib/auth.js';
import { prisma }     from '@/lib/prisma.js';
import { redirect }   from 'next/navigation';
import ProjectsList   from '@/components/ProjectsList.js';

const CHAIN_STEPS = [
  'cadrage-t1', 'cadrage-t2', 'analyste-marche',
  'modele-economique', 'modele-financier', 'audit-final', 'redacteur',
];

function computeChainStatus(livrables) {
  const verds = {};
  for (const l of livrables) {
    const m = l.path.match(/verification-([^/]+)\.json$/);
    if (!m) continue;
    try {
      const d    = JSON.parse(l.content);
      const step = d.step || m[1];
      verds[step] = d.verdict;
    } catch {}
  }
  const done  = CHAIN_STEPS.filter(s => verds[s] === 'PASS' || verds[s] === 'WARN').length;
  const fail  = CHAIN_STEPS.filter(s => verds[s] === 'FAIL').length;
  const total = CHAIN_STEPS.length;

  if (done === total)  return { type: 'complete', done, total };
  if (fail > 0)        return { type: 'fail',     done, total };
  if (done > 0)        return { type: 'partial',  done, total };
  return { type: 'empty', done: 0, total };
}

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect('/');

  const where = session.user.role === 'ADMIN' ? {} : { userId: session.user.id };

  const rawProjects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      slug: true,
      name: true,
      createdAt: true,
      livrables: {
        where: { path: { contains: 'verification-' } },
        select: { path: true, content: true },
      },
    },
  });

  const projects = rawProjects.map(({ slug, name, createdAt, livrables }) => ({
    slug,
    name,
    createdAt: createdAt.toISOString(),
    status:    computeChainStatus(livrables),
  }));

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

      <ProjectsList initialProjects={projects} />
    </div>
  );
}
