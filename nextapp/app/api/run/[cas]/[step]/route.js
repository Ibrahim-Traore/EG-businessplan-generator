export const runtime = 'nodejs';
export const maxDuration = 300;

import { auth }            from '@/lib/auth.js';
import { requireProjectAccess } from '@/lib/project-auth.js';
import Anthropic           from '@anthropic-ai/sdk';
import { runCMASession, runningControllers } from '@/lib/cma.js';
import { verifyStep }      from '@/lib/verifier.js';
import { CHAIN_ORDER, AGENT_COMMANDS } from '@/lib/constants.js';

export async function POST(req, { params }) {
  const { cas, step } = await params;

  const { error, status } = await requireProjectAccess(cas);
  if (error) return new Response(error, { status });

  if (!CHAIN_ORDER.includes(step))
    return new Response(`Étape inconnue : ${step}`, { status: 400 });

  let model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.model) model = body.model;
  } catch {}

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder    = new TextEncoder();
  const controller = new AbortController();
  runningControllers.set(cas, { controller, sessionId: null });

  const stream = new ReadableStream({
    async start(ctrl) {
      function send(evt) {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
      }

      try {
        const prompt = AGENT_COMMANDS[step](cas);
        await runCMASession(send, { step, cas, prompt, signal: controller.signal, model }, anthropic);

        send({ type: 'log', text: '\n\n[VÉRIFICATION EN COURS…]\n' });
        const verification = await verifyStep(cas, step, anthropic);
        send({ type: 'log', text: `Verdict : ${verification.verdict} — ${verification.summary}\n` });
        send({ type: 'done', verification });
      } catch (e) {
        send({ type: 'error', text: e.message });
      } finally {
        runningControllers.delete(cas);
        ctrl.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
