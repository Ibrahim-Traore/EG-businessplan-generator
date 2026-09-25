export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth }        from '@/lib/auth.js';
import { prisma }      from '@/lib/prisma.js';
import bcrypt          from 'bcryptjs';

export async function PATCH(req) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Non authentifié', { status: 401 });

  const { name, currentPassword, newPassword } = await req.json();

  // Mise à jour du nom uniquement
  if (name !== undefined && newPassword === undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { name: name.trim() || null },
    });
    return NextResponse.json({ ok: true });
  }

  // Mise à jour du mot de passe
  if (newPassword) {
    if (!currentPassword) return new Response('Mot de passe actuel requis.', { status: 400 });
    if (newPassword.length < 8)
      return new Response('Le mot de passe doit comporter au moins 8 caractères.', { status: 400 });

    const user  = await prisma.user.findUnique({ where: { id: session.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return new Response('Mot de passe actuel incorrect.', { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { password: hashed },
    });
    return NextResponse.json({ ok: true });
  }

  return new Response('Aucune modification à effectuer.', { status: 400 });
}
