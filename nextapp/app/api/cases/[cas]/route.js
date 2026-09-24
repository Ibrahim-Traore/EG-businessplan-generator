export const runtime = 'nodejs';

import { NextResponse }          from 'next/server';
import { auth }                  from '@/lib/auth.js';
import { prisma }                from '@/lib/prisma.js';
import { requireProjectAccess }  from '@/lib/project-auth.js';
import fs                        from 'fs';
import path                      from 'path';
import { LIVRABLES_DIR }         from '@/lib/constants.js';

export async function DELETE(req, { params }) {
  const { cas } = await params;
  if (!cas || !/^[a-z0-9-]+$/.test(cas))
    return new Response('Nom de cas invalide.', { status: 400 });

  const { error, status, session } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  // Seul l'owner ou l'ADMIN peut supprimer
  const project = await prisma.project.findUnique({ where: { slug: cas } });
  if (project.userId !== session.user.id && session.user.role !== 'ADMIN')
    return new Response('Accès interdit', { status: 403 });

  // Supprimer en DB
  await prisma.project.delete({ where: { slug: cas } });

  // Supprimer le dossier local si présent (no-op sur Vercel)
  try {
    const casDir = path.join(LIVRABLES_DIR, cas);
    if (fs.existsSync(casDir)) fs.rmSync(casDir, { recursive: true, force: true });
  } catch {}

  return NextResponse.json({ deleted: cas });
}
