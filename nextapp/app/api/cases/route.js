export const runtime = 'nodejs';

import { NextResponse }  from 'next/server';
import { auth }          from '@/lib/auth.js';
import { prisma }        from '@/lib/prisma.js';
import fs                from 'fs';
import path              from 'path';
import { LIVRABLES_DIR } from '@/lib/constants.js';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  // ADMIN voit tous les projets, CLIENT voit les siens
  const where = session.user.role === 'ADMIN' ? {} : { userId: session.user.id };
  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { slug: true, name: true, createdAt: true },
  });

  return NextResponse.json(projects.map(p => p.slug));
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) return new Response('Non autorisé', { status: 401 });

  const { cas } = await req.json();
  if (!cas || !/^[a-z0-9-]+$/.test(cas))
    return new Response('Nom de cas invalide (minuscules et tirets uniquement).', { status: 400 });

  // Vérifier unicité en DB
  const existing = await prisma.project.findUnique({ where: { slug: cas } });
  if (existing)
    return new Response(`Le cas "${cas}" existe déjà.`, { status: 409 });

  // Créer en DB
  await prisma.project.create({
    data: { slug: cas, name: cas, userId: session.user.id },
  });

  // Créer le dossier local si possible (no-op sur Vercel)
  try { fs.mkdirSync(path.join(LIVRABLES_DIR, cas, '00-brief'), { recursive: true }); } catch {}

  return NextResponse.json({ cas }, { status: 201 });
}
