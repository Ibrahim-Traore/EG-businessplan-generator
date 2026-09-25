export const runtime = 'nodejs';

import { NextResponse }         from 'next/server';
import { requireProjectAccess } from '@/lib/project-auth.js';
import { storageWrite, storageRead } from '@/lib/storage.js';

export async function GET(req, { params }) {
  const { cas } = await params;
  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const questionnaire = await storageRead(`livrables/${cas}/01-cadrage/questionnaire-v1.md`);
  return NextResponse.json({ questionnaire: questionnaire ?? null });
}

export async function POST(req, { params }) {
  const { cas } = await params;
  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const { content } = await req.json();
  if (!content?.trim()) return new Response('Contenu vide.', { status: 400 });

  await storageWrite(
    `livrables/${cas}/01-cadrage/reponses-questionnaire.md`,
    content.trim(),
  );

  return NextResponse.json({ ok: true });
}
