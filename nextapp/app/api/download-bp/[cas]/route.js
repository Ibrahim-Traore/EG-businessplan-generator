export const runtime = 'nodejs';

import { requireProjectAccess }  from '@/lib/project-auth.js';
import fs                        from 'fs';
import path                      from 'path';
import { LIVRABLES_DIR }         from '@/lib/constants.js';
import { generateDocx }          from '@/lib/md-to-docx.js';

export async function GET(req, { params }) {
  const { cas } = await params;

  if (!cas || !/^[a-z0-9-]+$/.test(cas))
    return new Response('Nom de cas invalide.', { status: 400 });

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const synthese = path.join(LIVRABLES_DIR, cas, '06-livraison', 'business-plan-synthese-v1.md');
  const annexes  = path.join(LIVRABLES_DIR, cas, '06-livraison', 'business-plan-annexes-v1.md');

  const fp = fs.existsSync(synthese) ? synthese : fs.existsSync(annexes) ? annexes : null;
  if (!fp) return new Response('Livrable non disponible', { status: 404 });

  try {
    const mdContent = fs.readFileSync(fp, 'utf-8');
    const buffer    = await generateDocx(mdContent, cas);

    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="business-plan-${cas}.docx"`,
        'Content-Length':      String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[download-bp] Erreur génération docx :', err);
    return new Response(`Erreur génération Word : ${err.message}`, { status: 500 });
  }
}
