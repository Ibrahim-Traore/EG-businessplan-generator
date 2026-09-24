export const runtime = 'nodejs';

import { NextResponse }           from 'next/server';
import { requireProjectAccess }   from '@/lib/project-auth.js';
import { CHAIN_ORDER }            from '@/lib/constants.js';
import { loadVerificationResult } from '@/lib/verifier.js';
import { storageGlob }            from '@/lib/storage.js';

export async function GET(req, { params }) {
  const { cas } = await params;

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const [steps, briefFiles] = await Promise.all([
    Promise.all(CHAIN_ORDER.map(async (step) => {
      const r = await loadVerificationResult(cas, step);
      return [step, r];
    })),
    storageGlob(`livrables/${cas}/00-brief/*`),
  ]);

  const result = { hasBrief: briefFiles !== '(vide)' };
  for (const [step, r] of steps) {
    if (r) result[step] = r;
  }
  return NextResponse.json(result);
}
