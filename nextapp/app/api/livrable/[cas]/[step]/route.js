export const runtime = 'nodejs';

import { NextResponse }                from 'next/server';
import { requireProjectAccess }        from '@/lib/project-auth.js';
import { getLivrablesRelPathsForStep } from '@/lib/constants.js';
import { storageRead }                 from '@/lib/storage.js';

export async function GET(req, { params }) {
  const { cas, step } = await params;

  if (!cas || !/^[a-z0-9-]+$/.test(cas))
    return new Response('Nom de cas invalide.', { status: 400 });

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const paths  = getLivrablesRelPathsForStep(cas, step);
  const result = [];
  for (const relPath of paths) {
    const content = await storageRead(relPath);
    if (content != null) result.push({ file: relPath.split('/').pop(), content });
  }

  if (result.length === 0) return new Response('Aucun livrable disponible', { status: 404 });
  return NextResponse.json(result);
}
