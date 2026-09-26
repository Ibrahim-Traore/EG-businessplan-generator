'use client';
import Link          from 'next/link';
import ChatInterface from '@/components/ChatInterface';

export default function ChatView({ cas, onBriefSaved }) {
  return (
    <div className="p-4 sm:p-5 w-full space-y-4">

      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href="/projects"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-eg-mid shrink-0 transition-colors text-sm font-bold"
        >
          ‹
        </Link>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 capitalize truncate">
            {cas.replace(/-/g, ' ')}
          </h1>
          <p className="text-xs text-eg-mid font-medium">Entretien de cadrage</p>
        </div>
      </div>

      {/* ── Interface de l'agent ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-eg-mid/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-[#f8faf7] flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-eg-mid flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            EG
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Agent de cadrage</p>
            <p className="text-xs text-gray-500">
              L'agent vous pose des questions pour constituer le brief du projet.
            </p>
          </div>
        </div>
        <ChatInterface cas={cas} onBriefSaved={onBriefSaved} />
      </div>

    </div>
  );
}
