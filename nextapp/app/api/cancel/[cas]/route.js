export const runtime = 'nodejs';

import { NextResponse }          from 'next/server';
import { requireProjectAccess }  from '@/lib/project-auth.js';
import { runningControllers }    from '@/lib/cma.js';

export async function POST(req, { params }) {
  const { cas } = await params;

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  const entry = runningControllers.get(cas);
  if (!entry) return NextResponse.json({ cancelled: false });

  entry.controller.abort();
  runningControllers.delete(cas);
  return NextResponse.json({ cancelled: true });
}
