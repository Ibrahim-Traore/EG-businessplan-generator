export const runtime = 'nodejs';

import { NextResponse }          from 'next/server';
import { requireProjectAccess }  from '@/lib/project-auth.js';
import { storageWrite }          from '@/lib/storage.js';
import fs                        from 'fs';
import path                      from 'path';
import { LIVRABLES_DIR }         from '@/lib/constants.js';

export async function POST(req, { params }) {
  const { cas } = await params;

  if (!cas || !/^[a-z0-9-]+$/.test(cas))
    return new Response('Nom de cas invalide.', { status: 400 });

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const formData = await req.formData();
  const files    = formData.getAll('files');

  if (!files || files.length === 0)
    return new Response('Aucun fichier reçu.', { status: 400 });

  const ALLOWED   = ['.md', '.txt', '.pdf', '.docx'];
  const MAX_BYTES = 10 * 1024 * 1024;
  const saved     = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) continue;
    const safeName = path.basename(file.name).replace(/[^\w.\-]/g, '_');
    const ext      = path.extname(safeName).toLowerCase();
    if (!ALLOWED.includes(ext)) continue;

    const bytes   = Buffer.from(await file.arrayBuffer());
    const relPath = `livrables/${cas}/00-brief/${safeName}`;

    if (['.md', '.txt'].includes(ext)) {
      // Texte : stocké en DB (et filesystem local via storageWrite)
      await storageWrite(relPath, bytes.toString('utf-8'));
    } else {
      // Binaire : placeholder en DB, fichier brut sur filesystem (local seulement)
      await storageWrite(relPath, `[BINARY:${file.name}]`);
      try {
        const abs = path.join(LIVRABLES_DIR, cas, '00-brief', safeName);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, bytes);
      } catch {}
    }

    saved.push(safeName);
  }

  return NextResponse.json({ saved });
}
