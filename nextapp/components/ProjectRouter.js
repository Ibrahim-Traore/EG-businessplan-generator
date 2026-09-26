'use client';
import { useState, useEffect, useCallback } from 'react';
import ChatView     from '@/components/ChatView';
import PipelineView from '@/components/PipelineView';

export default function ProjectRouter({ cas }) {
  const [status, setStatus] = useState(null); // null = chargement initial

  // Chargement initial avec flag cancelled pour éviter les mises à jour sur projet changé
  useEffect(() => {
    let cancelled = false;
    setStatus(null);

    fetch(`/api/status/${cas}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => { if (!cancelled) setStatus(data); })
      .catch(() => { if (!cancelled) setStatus({}); });

    return () => { cancelled = true; };
  }, [cas]);

  // Rafraîchissement manuel (ex. après sauvegarde du brief) — sans spinner
  const refreshStatus = useCallback(() => {
    fetch(`/api/status/${cas}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setStatus(data))
      .catch(() => {});
  }, [cas]);

  // Spinner pendant le chargement initial
  if (status === null) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="w-5 h-5 border-2 border-eg-mid border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mode questionnaire : brief absent, pas de réponses, ET aucun step de chaîne lancé
  const hasChainWork = Object.keys(status).some(
    k => k !== 'hasBrief' && k !== 'hasResponses' && status[k]?.verdict
  );
  if (status.hasBrief === false && !status.hasResponses && !hasChainWork) {
    return <ChatView cas={cas} onBriefSaved={refreshStatus} />;
  }

  // Brief ou réponses disponibles → vue chaîne complète
  return <PipelineView cas={cas} />;
}
