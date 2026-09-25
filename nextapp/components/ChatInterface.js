'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const SYNTHESIS_START = '<!--SYNTHESE-->';
const SYNTHESIS_END   = '<!--/SYNTHESE-->';

// Premier message caché envoyé à l'API pour déclencher le greeting
// — jamais affiché dans l'interface
const TRIGGER = { role: 'user', content: '[DEBUT ENTRETIEN]' };

export default function ChatInterface({ cas, onBriefSaved }) {
  const [uiMessages, setUiMessages] = useState([]);
  const [input,      setInput]      = useState('');
  const [streaming,  setStreaming]  = useState(false);
  const [briefSaved, setBriefSaved] = useState(false);
  const [error,      setError]      = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const didInit   = useRef(false);

  // Scroll automatique en bas à chaque nouveau token
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [uiMessages]);

  // Greeting initial au montage
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchNext([]);
  }, []); // eslint-disable-line

  const fetchNext = useCallback(async (history) => {
    setStreaming(true);
    setError(null);

    // Placeholder de la réponse en cours de streaming
    setUiMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    let accumulated = '';
    try {
      const res = await fetch(`/api/chat/${cas}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // API: strip UI-only fields (streaming), toujours commencer par TRIGGER
        body:    JSON.stringify({
          messages: [TRIGGER, ...history.map(({ role, content }) => ({ role, content }))],
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          const line = part.trim().replace(/^data:\s*/, '');
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.text) {
              accumulated += ev.text;
              setUiMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: accumulated, streaming: true },
              ]);
            }
            if (ev.type === 'done') {
              await handleResponse(accumulated);
            }
            if (ev.type === 'error') {
              throw new Error(ev.text);
            }
          } catch (parseErr) {
            if (parseErr.message.startsWith('Erreur')) throw parseErr;
          }
        }
      }
    } catch (e) {
      setUiMessages(prev => prev.slice(0, -1)); // retire le placeholder
      setError(e.message || 'Erreur réseau');
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [cas]); // eslint-disable-line

  async function handleResponse(text) {
    const si = text.indexOf(SYNTHESIS_START);
    const ei = text.indexOf(SYNTHESIS_END);

    if (si !== -1 && ei > si) {
      // Synthèse détectée
      const synthesis = text.slice(si + SYNTHESIS_START.length, ei).trim();
      const before    = text.slice(0, si).trim();
      const display   = before || 'J\'ai recueilli toutes les informations nécessaires. Enregistrement du brief…';

      setUiMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: display, streaming: false },
      ]);

      // Sauvegarde
      try {
        const r = await fetch(`/api/reponses/${cas}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ content: synthesis }),
        });
        if (!r.ok) throw new Error(await r.text());
        setBriefSaved(true);
        onBriefSaved?.();
      } catch (e) {
        setError(`Erreur lors de la sauvegarde du brief : ${e.message}`);
      }
    } else {
      // Message normal
      setUiMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: text, streaming: false },
      ]);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || streaming || briefSaved) return;
    const userMsg    = { role: 'user', content: text };
    const newHistory = [...uiMessages, userMsg];
    setUiMessages(newHistory);
    setInput('');
    fetchNext(newHistory);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── État final : brief sauvegardé ─────────────────────────────────────────
  if (briefSaved) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#549E39" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-800">Brief de cadrage constitué</p>
        <p className="text-xs text-gray-500">La chaîne d'agents est prête à être lancée.</p>
      </div>
    );
  }

  // ── Interface chat ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: '520px' }}>

      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#fafaf8]">
        {uiMessages.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400 italic">
            <span className="w-6 h-6 rounded-full bg-eg-mid/20 flex items-center justify-center text-eg-mid text-[10px] font-bold shrink-0">EG</span>
            Connexion à l'agent de cadrage…
          </div>
        )}

        {uiMessages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-eg-mid flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-0.5">
                EG
              </div>
            )}
            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
              msg.role === 'user'
                ? 'bg-eg-mid text-white rounded-br-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
            }`}>
              {msg.content || (msg.streaming
                ? <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                  </span>
                : ''
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
            <button className="ml-2 underline" onClick={() => { setError(null); fetchNext(uiMessages); }}>Réessayer</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Votre réponse… (Entrée pour envoyer, Maj+Entrée pour un retour à la ligne)"
          rows={2}
          disabled={streaming}
          className="flex-1 px-3 py-2 text-sm text-gray-700 bg-[#f8f8f5] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid resize-none disabled:opacity-50 leading-relaxed"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || streaming}
          className="w-9 h-9 flex items-center justify-center bg-eg-mid text-white rounded-xl hover:bg-eg-muted disabled:opacity-40 transition-colors shrink-0"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
