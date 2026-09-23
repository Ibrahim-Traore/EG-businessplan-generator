'use client';
import { useState, useRef } from 'react';
import { useRouter }        from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [casName, setCasName]   = useState('');
  const [mode, setMode]         = useState('upload');
  const [files, setFiles]       = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!casName.trim()) { setError('Nom du cas obligatoire.'); return; }

    setLoading(true);
    const createRes = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cas: casName.trim() }),
    });
    if (!createRes.ok) {
      setError(await createRes.text() || 'Erreur lors de la création du cas.');
      setLoading(false);
      return;
    }

    if (mode === 'upload' && files.length > 0) {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const uploadRes = await fetch(`/api/upload-brief/${casName.trim()}`, { method: 'POST', body: fd });
      if (!uploadRes.ok) {
        setError(await uploadRes.text() || "Erreur lors de l'upload.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push(`/projects/${casName.trim()}`);
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Nouveau projet</h1>
      <p className="text-sm text-gray-500 mb-6">Créez un cas pilote et fournissez le brief client pour démarrer la chaîne.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom du cas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Nom du cas <span className="text-eg-mid">*</span>
          </label>
          <input
            type="text"
            value={casName}
            onChange={e => setCasName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="ex. manden-mining"
            className="w-full px-3 py-2.5 bg-[#f8f8f5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid"
          />
          <p className="text-xs text-gray-400 mt-1.5">Minuscules et tirets uniquement (ex. metalerie-conakry)</p>
        </div>

        {/* Mode de brief */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Mode de brief</label>
          <div className="flex gap-2 mb-4">
            {[['upload', 'Déposer des fichiers'], ['questions', 'Questionnaire agent']].map(([v, l]) => (
              <button
                key={v} type="button" onClick={() => setMode(v)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  mode === v ? 'bg-eg-mid text-white border-eg-mid' : 'text-gray-600 border-gray-200 hover:border-eg-mid hover:text-eg-dark bg-[#f8f8f5]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {mode === 'upload' && (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-eg-mid bg-green-50' : 'border-gray-200 hover:border-eg-mid bg-[#f8f8f5]'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <input ref={fileRef} type="file" multiple accept=".md,.txt,.pdf,.docx" className="hidden" onChange={e => { setFiles(prev => [...prev, ...Array.from(e.target.files)]); }} />
                <svg className="mx-auto mb-2 text-gray-300" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-gray-500">
                  Glissez vos fichiers ici ou <span className="text-eg-mid font-semibold">parcourir</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, Word, Markdown — taille max 10 Mo</p>
              </div>

              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-sm">
                      <span className="flex items-center gap-2 text-gray-700">
                        <span className="text-eg-mid font-bold">✓</span>{f.name}
                      </span>
                      <button type="button" onClick={() => removeFile(i)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {mode === 'questions' && (
            <p className="text-sm text-gray-500 bg-[#f8f8f5] rounded-lg p-3 border border-gray-200">
              Le questionnaire de cadrage sera généré automatiquement par l'agent lors du lancement de la chaîne.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-eg-mid text-white text-sm font-semibold rounded-xl hover:bg-eg-muted transition-colors disabled:opacity-60 shadow-sm"
        >
          {loading ? 'Création en cours…' : 'Créer le projet →'}
        </button>
      </form>
    </div>
  );
}
