export const runtime = 'nodejs';

import { NextResponse }          from 'next/server';
import { requireProjectAccess }  from '@/lib/project-auth.js';
import fs                        from 'fs';
import { getLivrablesForStep }   from '@/lib/constants.js';

export async function GET(req, { params }) {
  const { cas, step } = await params;

  if (!cas || !/^[a-z0-9-]+$/.test(cas))
    return new Response('Nom de cas invalide.', { status: 400 });

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const files  = getLivrablesForStep(cas, step);
  const result = [];
  for (const fp of files) {
    if (!fs.existsSync(fp)) continue;
    result.push({ file: fp.split(/[\\/]/).pop(), content: fs.readFileSync(fp, 'utf-8') });
  }

  if (result.length === 0) return new Response('Aucun livrable disponible', { status: 404 });
  return NextResponse.json(result);
}
