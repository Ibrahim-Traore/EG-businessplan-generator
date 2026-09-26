'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link          from 'next/link';
import ChatInterface from '@/components/ChatInterface';

// ─── Configuration ────────────────────────────────────────────────────────────

const MODELS = [
  { label: 'Haiku',  value: 'claude-haiku-4-5-20251001' },
  { label: 'Sonnet', value: 'claude-sonnet-4-6' },
  { label: 'Opus',   value: 'claude-opus-5' },
];

const DEFAULT_MODELS = {
  'cadrage-t1':        'claude-haiku-4-5-20251001',
  'cadrage-t2':        'claude-sonnet-4-6',
  'analyste-marche':   'claude-sonnet-4-6',
  'modele-economique': 'claude-sonnet-4-6',
  'modele-financier':  'claude-sonnet-4-6',
  'audit-final':       'claude-sonnet-4-6',
  'redacteur':         'claude-sonnet-4-6',
};

const STEP_LABELS = {
  'cadrage-t1':        'T1 — Questionnaire de cadrage',
  'cadrage-t2':        'T2 — Fiche projet & résumé exécutif',
  'analyste-marche':   'Étude de marché complète',
  'modele-economique': 'Hypothèses opérationnelles chiffrées',
  'modele-financier':  'Projections financières 5 ans',
  'audit-final':       "Rapport d'audit transversal",
  'redacteur':         'Business plan (synthèse + annexes)',
};

const CARDS = [
  { num: '01', label: 'Cadrage',          sub: 'Questionnaire · Fiche projet · Résumé exécutif',             steps: ['cadrage-t1', 'cadrage-t2'] },
  { num: '02', label: 'Analyste marché',  sub: 'PESTEL · TAM/SAM/SOM · Porter · Segmentation',               steps: ['analyste-marche'] },
  { num: '03', label: 'Modèle économique',sub: 'BMC · VPC · Revenus · Coûts · RH · CapEx · BFR',             steps: ['modele-economique'] },
  { num: '04', label: 'Modèle financier', sub: 'P&L · Bilan · Cash-flow · TRI · VAN · DSCR · Sensibilité',   steps: ['modele-financier'] },
  { num: '05', label: 'Audit final',      sub: 'Cohérence inter-agents · Sourcing · Conformité EG',           steps: ['audit-final'] },
  { num: '06', label: 'Rédacteur',        sub: 'Synthèse narrative · Annexes techniques',                     steps: ['redacteur'] },
];

const ALL_STEPS = CARDS.flatMap(c => c.steps);

const STEPPER_STEPS = [
  { key: 'cadrage-t1',        label: 'T1 · Cadrage' },
  { key: 'cadrage-t2',        label: 'T2 · Cadrage' },
  { key: 'analyste-marche',   label: 'Marché' },
  { key: 'modele-economique', label: 'Économique' },
  { key: 'modele-financier',  label: 'Financier' },
  { key: 'audit-final',       label: 'Audit' },
  { key: 'redacteur',         label: 'Rédacteur' },
];

// ─── Sous-composants ──────────────────────────────────────────────────────────

function VerdictBadge({ verdict }) {
  if (!verdict) return null;
  const cfg = {
    PASS: { cls: 'bg-green-50 text-green-700 border-green-200', icon: '✓ ' },
    WARN: { cls: 'bg-amber-50 text-amber-600 border-amber-200', icon: '⚠ ' },
    FAIL: { cls: 'bg-red-50 text-red-600 border-red-200',       icon: '✕ ' },
  }[verdict];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.icon}{verdict}
    </span>
  );
}

function ModelSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-eg-mid disabled:opacity-40 cursor-pointer"
    >
      {MODELS.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PipelineView({ cas }) {
  const [statuses,       setStatuses]      = useState({});
  const [statusLoading,  setStatusLoading] = useState(true);
  const [running,        setRunning]       = useState(null);
  const [chainRunning,  setChainRunning]  = useState(false);
  const [elapsed,       setElapsed]       = useState(0);
  const [chainElapsed,  setChainElapsed]  = useState(0);
  const [stepTimings,   setStepTimings]   = useState({});
  const [stopInfo,      setStopInfo]      = useState(null);
  const [stepModels,    setStepModels]    = useState(DEFAULT_MODELS);

  const [briefState, setBriefState] = useState(null);

  const timerRef        = useRef(null);
  const chainTimerRef   = useRef(null);
  const chainRef        = useRef(false);
  const briefRef        = useRef(null);
  const elapsedRef      = useRef(0);
  const chainElapsedRef = useRef(0);

  // ── Statuts ────────────────────────────────────────────────────────────────
  const fetchStatuses = useCallback(async () => {
    try {
      const r = await fetch(`/api/status/${cas}`);
      if (r.ok) setStatuses(await r.json());
    } catch {}
    finally { setStatusLoading(false); }
  }, [cas]);

  // Réinitialiser à chaque changement de projet pour éviter l'affichage de l'état précédent
  useEffect(() => {
    setStatuses({});
    setStatusLoading(true);
    fetchStatuses();
  }, [fetchStatuses]);

  // Chargement des timings sauvegardés
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`timings-${cas}`);
      if (raw) setStepTimings(JSON.parse(raw));
    } catch {}
  }, [cas]);


  // ── Chrono étape ───────────────────────────────────────────────────────────
  function startTimer() {
    setElapsed(0);
    elapsedRef.current = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { elapsedRef.current += 1; setElapsed(s => s + 1); }, 1000);
  }
  function stopTimer() { clearInterval(timerRef.current); }

  // ── Chrono chaîne ──────────────────────────────────────────────────────────
  function startChainTimer() {
    setChainElapsed(0);
    chainElapsedRef.current = 0;
    clearInterval(chainTimerRef.current);
    chainTimerRef.current = setInterval(() => { chainElapsedRef.current += 1; setChainElapsed(s => s + 1); }, 1000);
  }
  function stopChainTimer() { clearInterval(chainTimerRef.current); }

  function fmt(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

  // ── Lancement d'une étape ──────────────────────────────────────────────────
  async function runStep(step) {
    setRunning(step);
    setStopInfo(null);
    startTimer();

    const res = await fetch(`/api/run/${cas}/${step}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: stepModels[step] }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => 'Erreur serveur.');
      setStopInfo({ step, reason: msg });
      setRunning(null); stopTimer();
      return false;
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', ok = true;

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
          if (ev.type === 'done') {
            await fetchStatuses();
            if (ev.verification?.verdict === 'FAIL') {
              setStopInfo({ step, reason: `Vérification FAIL — ${ev.verification.summary}` });
              ok = false;
            }
          }
          if (ev.type === 'error') { setStopInfo({ step, reason: ev.text }); ok = false; }
        } catch {}
      }
    }
    setRunning(null); stopTimer();
    // Sauvegarder la durée de cette étape
    const duration = elapsedRef.current;
    if (duration > 0) {
      setStepTimings(prev => {
        const next = { ...prev, [step]: duration };
        try { localStorage.setItem(`timings-${cas}`, JSON.stringify(next)); } catch {}
        return next;
      });
    }
    return ok;
  }

  // ── Arrêt d'une étape ─────────────────────────────────────────────────────
  function stopStep() {
    chainRef.current = false;
    setChainRunning(false);
    fetch(`/api/cancel/${cas}`, { method: 'POST' }).catch(() => {});
    setRunning(null); stopTimer();
  }

  // ── Chaîne complète ───────────────────────────────────────────────────────
  async function runChain() {
    setChainRunning(true);
    chainRef.current = true;
    startChainTimer();
    const snap = { ...statuses };
    for (const step of ALL_STEPS) {
      if (!chainRef.current) break;
      // Mode questionnaire : T1 sauté car les réponses sont déjà enregistrées
      if (step === 'cadrage-t1' && snap.hasResponses) continue;
      const verdict = snap[step]?.verdict;
      if (verdict === 'PASS' || verdict === 'WARN') continue;
      const ok = await runStep(step);
      if (!ok) break;
    }
    stopChainTimer();
    setChainRunning(false);
    chainRef.current = false;
  }

  function cancelChain() {
    chainRef.current = false;
    stopChainTimer();
    stopStep();
  }


  // ── Statut stepper ─────────────────────────────────────────────────────────
  function stepperStatus(keys) {
    if (keys.some(k => running === k)) return 'running';
    const verdicts = keys.map(k => statuses[k]?.verdict).filter(Boolean);
    if (verdicts.length === keys.length) {
      return verdicts.some(v => v === 'FAIL') ? 'fail' : 'done';
    }
    if (verdicts.length > 0) return 'partial';
    return 'pending';
  }

  // ── Statut card ────────────────────────────────────────────────────────────
  function cardStatus(steps) {
    if (steps.some(k => running === k)) return 'running';
    const verdicts = steps.map(k => statuses[k]?.verdict).filter(Boolean);
    if (verdicts.length === steps.length) {
      if (verdicts.some(v => v === 'FAIL')) return 'fail';
      if (verdicts.some(v => v === 'WARN')) return 'warn';
      return 'done';
    }
    return 'pending';
  }

  const hasDone   = Object.values(statuses).some(s => s?.verdict);
  const hasPass   = ALL_STEPS.some(k => statuses[k]?.verdict === 'PASS' || statuses[k]?.verdict === 'WARN');
  const hasFail   = ALL_STEPS.some(k => statuses[k]?.verdict === 'FAIL');
  const chainLabel = hasFail ? 'Reprendre depuis l\'échec' : hasPass ? 'Reprendre la chaîne' : 'Lancer la chaîne complète';

  return (
    <div className="p-4 sm:p-5 w-full space-y-4">

      {/* ── En-tête projet ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/projects"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-eg-mid shrink-0 transition-colors text-sm font-bold">
            ‹
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 capitalize truncate">
              {cas.replace(/-/g, ' ')}
            </h1>
            <p className="text-xs text-eg-mid font-medium">
              {statuses.hasBrief === false ? 'Mode questionnaire' : 'Brief importé'}
            </p>
          </div>
        </div>
        <input
          ref={briefRef}
          type="file"
          multiple
          accept=".md,.txt,.pdf,.docx"
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            setBriefState('uploading');
            e.target.value = '';
            const fd = new FormData();
            files.forEach(f => fd.append('files', f));
            try {
              const r = await fetch(`/api/upload-brief/${cas}`, { method: 'POST', body: fd });
              if (!r.ok) { setBriefState(await r.text() || 'Erreur upload'); return; }
              const { saved } = await r.json();
              setBriefState(`done:${saved.join(', ')}`);
              setTimeout(() => setBriefState(null), 4000);
            } catch (err) {
              setBriefState(err.message || 'Erreur réseau');
            }
          }}
        />
        <button
          onClick={() => briefRef.current?.click()}
          disabled={briefState === 'uploading'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 bg-white rounded-lg hover:border-eg-mid transition-colors shrink-0 disabled:opacity-50">
          {briefState === 'uploading' ? (
            <>
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 01-9-9"/>
              </svg>
              Upload…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Remplacer le brief
            </>
          )}
        </button>
        {briefState && briefState !== 'uploading' && (
          <span className={`text-xs px-2 py-1 rounded-md ${briefState.startsWith('done:') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {briefState.startsWith('done:') ? `✓ ${briefState.slice(5)}` : briefState}
          </span>
        )}
      </div>

      {/* ── Mode questionnaire : chat avec l'agent ───────────────────────── */}
      {!statusLoading && statuses.hasBrief === false && !statuses.hasResponses && (
        <div className="bg-white rounded-xl border border-eg-mid/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-[#f8faf7] flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-eg-mid flex items-center justify-center text-white text-[10px] font-bold shrink-0">EG</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Entretien de cadrage</p>
              <p className="text-xs text-gray-500">L'agent vous pose des questions pour constituer le brief du projet.</p>
            </div>
          </div>
          <ChatInterface cas={cas} onBriefSaved={fetchStatuses} />
        </div>
      )}

      {/* ── Barre de lancement (visible uniquement si brief ou réponses disponibles) ─ */}
      {!statusLoading && (statuses.hasBrief !== false || statuses.hasResponses) && (
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        {chainRunning ? (
          <button onClick={cancelChain}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm">
            <span className="w-2.5 h-2.5 bg-white rounded-sm inline-block shrink-0" />
            Arrêter la chaîne
          </button>
        ) : (
          <button onClick={runChain} disabled={!!running}
            className="flex items-center gap-2 px-4 py-2 bg-eg-mid text-white text-sm font-semibold rounded-lg hover:bg-eg-muted transition-colors shadow-sm disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            {chainLabel}
          </button>
        )}
        <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
          <span className="text-sm text-gray-400 truncate italic">
            {running        ? STEP_LABELS[running] :
             chainRunning   ? 'Chaîne en cours…' :
             hasDone        ? 'Chaîne terminée' :
             'Prêt à lancer'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {chainRunning && (
              <span className="text-sm font-mono text-gray-500" title="Durée chaîne">{fmt(chainElapsed)}</span>
            )}
            {running && !chainRunning && (
              <span className="text-sm font-mono text-gray-500">{fmt(elapsed)}</span>
            )}
            {!running && !chainRunning && statuses['redacteur']?.verdict && (
              <button onClick={() => window.open(`/api/download-bp/${cas}`)}
                className="text-xs px-3 py-1.5 border border-eg-mid text-eg-mid rounded-lg hover:bg-eg-mid hover:text-white bg-white transition-colors font-medium">
                ↓ Télécharger (.docx)
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Bannière d'erreur ─────────────────────────────────────────────── */}
      {stopInfo && (
        <div className="bg-white border border-orange-300 rounded-xl px-4 py-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <svg className="text-orange-500 shrink-0" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-sm font-semibold text-orange-600">
                {STEP_LABELS[stopInfo.step] || stopInfo.step}{' '}
                <span className="font-normal text-orange-500">s'est arrêté</span>
              </span>
            </div>
            <button onClick={() => setStopInfo(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
          <div className="pl-3 border-l-2 border-orange-200 text-sm text-orange-700 bg-orange-50/60 py-2 pr-3 rounded-r break-words">
            {stopInfo.reason}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Corrigez le problème, puis relancez l'étape manuellement via le bouton <strong>Lancer</strong>.
          </p>
        </div>
      )}

      {/* ── Stepper + cards (masqués pendant l'entretien) ─────────────────── */}
      {!statusLoading && (statuses.hasBrief !== false || statuses.hasResponses) && (
      <>
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-5 overflow-x-auto">
        <div className="flex items-start w-full min-w-[500px]">
          {STEPPER_STEPS.map(({ key, label }, i) => {
            const verdict = statuses[key]?.verdict;
            const isRun   = running === key;
            const st =
              isRun                           ? 'running' :
              verdict === 'PASS' || verdict === 'WARN' ? 'done' :
              verdict === 'FAIL'              ? 'fail' :
              'pending';

            const circleClass =
              st === 'running' ? 'bg-eg-mid text-white animate-pulse' :
              st === 'done'    ? 'bg-eg-mid text-white' :
              st === 'fail'    ? 'bg-red-400 text-white' :
              'bg-gray-100 text-gray-400 border border-gray-200';

            const lineClass = (st === 'done' || st === 'fail') ? 'bg-eg-mid' : 'bg-gray-200';

            return (
              <div key={key} className="flex items-start flex-1 min-w-0">
                {/* Cercle + label */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${circleClass}`}>
                    {st === 'done' || st === 'fail' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1.5 text-center leading-tight w-16 break-words">{label}</span>
                </div>
                {/* Connecteur */}
                {i < STEPPER_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mt-4 mx-1 ${lineClass}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cards d'étapes ───────────────────────────────────────────────── */}
      <div className="space-y-5">

        {CARDS.map(card => {
          const st = cardStatus(card.steps);
          const statusLabel =
            st === 'running' ? 'EN COURS' :
            st === 'done'    ? 'TERMINÉ' :
            st === 'warn'    ? 'À VÉRIFIER' :
            st === 'fail'    ? 'ÉCHEC' :
            'EN ATTENTE';
          const statusCls =
            st === 'running' ? 'text-eg-mid font-semibold animate-pulse' :
            st === 'done'    ? 'text-green-600 font-semibold' :
            st === 'warn'    ? 'text-amber-500 font-semibold' :
            st === 'fail'    ? 'text-red-500 font-semibold' :
            'text-gray-300 font-semibold';
          const cardBorder =
            st === 'done' ? 'border-green-100' :
            st === 'warn' ? 'border-amber-100' :
            'border-gray-200';

          return (
            <div key={card.num} className={`bg-white rounded-xl border overflow-hidden ${cardBorder}`}>

              {/* En-tête card */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <span className="w-9 h-9 rounded-lg bg-[#f0f0eb] text-eg-dark text-xs font-bold flex items-center justify-center border border-gray-200 shrink-0">
                  {card.num}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{card.label}</p>
                  <p className="text-xs text-gray-400 truncate">{card.sub}</p>
                </div>
                <span className={`text-xs tracking-wide shrink-0 hidden sm:inline ${statusCls}`}>{statusLabel}</span>
              </div>

              {/* Lignes de sous-étapes */}
              {card.steps.map((stepKey, si) => {
                const status    = statuses[stepKey];
                const isRunning = running === stepKey;
                const isAnyRunning = !!running || chainRunning;

                const dotCls = isRunning
                  ? 'bg-eg-mid animate-pulse'
                  : status?.verdict === 'PASS' ? 'bg-green-400'
                  : status?.verdict === 'FAIL' ? 'bg-red-400'
                  : status?.verdict === 'WARN' ? 'bg-amber-400'
                  : 'bg-gray-300';

                return (
                  <div key={stepKey}
                    className={`px-4 py-3 ${si < card.steps.length - 1 ? 'border-b border-gray-50' : ''} ${isRunning ? 'bg-green-50/30' : ''}`}>
                    {/* Desktop : ligne unique / Mobile : 2 lignes */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotCls}`} />
                      <span className="flex-1 text-sm text-gray-700 min-w-0 truncate sm:max-w-none" style={{flexBasis: 'calc(100% - 28px)', flexGrow: 1}}>
                        {STEP_LABELS[stepKey]}
                      </span>
                      {status?.verdict && !isRunning && <VerdictBadge verdict={status.verdict} />}
                      {!isRunning && stepTimings[stepKey] !== undefined && (
                        <span className="text-xs text-gray-400 font-mono shrink-0">{fmt(stepTimings[stepKey])}</span>
                      )}
                      {isRunning && (
                        <>
                          <span className="text-xs text-eg-mid font-medium animate-pulse shrink-0">en cours…</span>
                          <span className="text-xs text-gray-400 font-mono shrink-0">{fmt(elapsed)}</span>
                        </>
                      )}
                      {/* Actions : toujours sur la même ligne que le label sur sm+, ligne propre sur mobile */}
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pl-5 sm:pl-0">
                        <ModelSelect
                          value={stepModels[stepKey]}
                          onChange={v => setStepModels(prev => ({ ...prev, [stepKey]: v }))}
                          disabled={isAnyRunning}
                        />
                        {isRunning ? (
                          <button onClick={stopStep}
                            className="text-xs px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm shrink-0">
                            Arrêter
                          </button>
                        ) : (
                          <button onClick={() => runStep(stepKey)} disabled={isAnyRunning}
                            className="text-xs px-4 py-1.5 bg-eg-mid text-white font-semibold rounded-lg hover:bg-eg-muted transition-colors shadow-sm shrink-0 disabled:opacity-40">
                            Lancer
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Résumé WARN : fichier produit mais vérification auto non concluante */}
                    {status?.verdict === 'WARN' && !isRunning && (
                      <p className="mt-1.5 ml-5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                        <span className="font-semibold">WARN — </span>
                        {status.summary || 'Vérification automatique non concluante. Le fichier a été produit — revue manuelle recommandée.'}
                        {' '}
                        <span className="text-amber-500">La chaîne continue.</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      </>
      )} {/* fin du bloc conditionnel stepper+cards */}

      {/* ── Téléchargement ───────────────────────────────────────────────── */}
      {statuses['redacteur']?.verdict && !running && !chainRunning && (
        <div className="bg-white rounded-xl border border-eg-dark/30 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-eg-dark">Business plan prêt</p>
            <p className="text-xs text-gray-500 mt-0.5">Synthèse narrative + annexes — format Word, charte EG</p>
          </div>
          <button
            onClick={() => window.open(`/api/download-bp/${cas}`)}
            className="flex items-center gap-2 px-4 py-2 bg-eg-dark text-white text-sm font-semibold rounded-lg hover:bg-eg-muted transition-colors shadow-sm shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Télécharger .docx
          </button>
        </div>
      )}

    </div>
  );
}
