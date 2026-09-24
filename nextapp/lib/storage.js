import path from 'path';
import fs   from 'fs';
import { prisma }     from './prisma.js';
import { AGENTS_DIR } from './constants.js';

function toRelPath(p) {
  if (path.isAbsolute(p)) return path.relative(AGENTS_DIR, p).replace(/\\/g, '/');
  return p.replace(/\\/g, '/');
}

function extractSlug(relPath) {
  const parts = relPath.split('/');
  return (parts[0] === 'livrables' && parts.length >= 2) ? parts[1] : null;
}

function toAbs(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(AGENTS_DIR, filePath);
}

export async function storageRead(filePath) {
  const rel  = toRelPath(filePath);
  const slug = extractSlug(rel);
  if (slug) {
    const record = await prisma.livrable.findUnique({
      where: { projectSlug_path: { projectSlug: slug, path: rel } },
    }).catch(() => null);
    if (record) return record.content;
  }
  const abs = toAbs(filePath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : null;
}

export async function storageWrite(filePath, content) {
  const rel  = toRelPath(filePath);
  const slug = extractSlug(rel);
  if (slug) {
    await prisma.livrable.upsert({
      where:  { projectSlug_path: { projectSlug: slug, path: rel } },
      update: { content },
      create: { projectSlug: slug, path: rel, content },
    });
  }
  try {
    const abs = toAbs(filePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
  } catch {}
  return `Fichier écrit : ${filePath} (${content.length} caractères)`;
}

export async function storageGlob(pattern) {
  const rel  = toRelPath(pattern);
  const slug = extractSlug(rel);
  const results = new Set();

  if (slug) {
    const prefix  = rel.endsWith('/') ? rel : rel + '/';
    const records = await prisma.livrable.findMany({
      where:  { projectSlug: slug, path: { startsWith: prefix } },
      select: { path: true },
    }).catch(() => []);
    for (const r of records) results.add(r.path);
  }

  try {
    if (!pattern.includes('*')) {
      const abs = toAbs(pattern);
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
        for (const f of fs.readdirSync(abs)) {
          results.add(toRelPath(path.join(abs, f)));
        }
      }
    }
  } catch {}

  return [...results].join('\n') || '(vide)';
}

export async function storageExists(filePath) {
  const content = await storageRead(filePath);
  return content != null;
}
