export const runtime = 'nodejs';

import { NextResponse }          from 'next/server';
import { requireProjectAccess }  from '@/lib/project-auth.js';
import { CHAIN_ORDER }           from '@/lib/constants.js';
import { loadVerificationResult } from '@/lib/verifier.js';

export async function GET(req, { params }) {
  const { cas } = await params;

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const result = {};
  await Promise.all(CHAIN_ORDER.map(async (step) => {
    const r = await loadVerificationResult(cas, step);
    if (r) result[step] = r;
  }));
  return NextResponse.json(result);
}
