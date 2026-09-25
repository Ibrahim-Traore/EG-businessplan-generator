export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth }         from '@/lib/auth.js';
import { prisma }       from '@/lib/prisma.js';
import bcrypt           from 'bcryptjs';

async function requireAdmin(req) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET(req) {
  if (!await requireAdmin(req)) return new Response('Non autorisé', { status: 401 });
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(users);
}

export async function POST(req) {
  if (!await requireAdmin(req)) return new Response('Non autorisé', { status: 401 });

  const { email, password, name, role } = await req.json();
  if (!email || !password) return new Response('Email et mot de passe obligatoires.', { status: 400 });
  if (!['ADMIN', 'MEMBRE'].includes(role)) return new Response('Rôle invalide.', { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return new Response('Email déjà utilisé.', { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user   = await prisma.user.create({
    data: { email, password: hashed, name: name || null, role },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json(user, { status: 201 });
}

export async function DELETE(req) {
  if (!await requireAdmin(req)) return new Response('Non autorisé', { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response('ID manquant.', { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ deleted: id });
}
