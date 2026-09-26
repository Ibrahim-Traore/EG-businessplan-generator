import { auth }   from './auth.js';
import { prisma } from './prisma.js';

/**
 * Vérifie que l'utilisateur connecté est propriétaire du projet `slug`.
 * Retourne { project, session } ou { error, status }.
 */
export async function requireProjectAccess(slug) {
  const session = await auth();
  if (!session?.user) return { error: 'Non autorisé', status: 401 };

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return { error: 'Projet introuvable', status: 404 };

  if (project.userId !== session.user.id) {
    return { error: 'Accès interdit', status: 403 };
  }

  return { project, session };
}
