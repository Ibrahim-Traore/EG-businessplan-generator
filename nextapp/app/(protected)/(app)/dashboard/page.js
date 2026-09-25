'use client';
import { useState, useRef } from 'react';
import { useRouter }        from 'next/navigation';

const STADES = ['Idée', 'Préfaisabilité', 'Faisabilité', 'Création / démarrage', 'Croissance / développement'];
const OBJECTIFS = [
  'Financement bancaire',
  'Levée de fonds (bailleur, DFI, fonds d\'impact)',
  'Accord avec un partenaire stratégique',
  'Usage interne (pilotage, conseil d\'administration)',
];

const EMPTY_FORM = {
  nomProjet: '', promoteur: '', description: '',
  secteur: '', localisation: '', stade: '',
  marche: '', offre: '',
  investissement: '', financement: '', emplois: '',
  objectif: '', risques: '',
};

function formatResponses(cas, q) {
  const today = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  return `# Réponses au questionnaire de cadrage — ${cas}

Date : ${today}
Mode : Questionnaire guidé (pré-rempli par le promoteur)

---

## 1. Identité du projet

**Nom officiel :** ${q.nomProjet || '—'}

**Promoteur(s) :**
${q.promoteur || '—'}

**Description de l'activité :**
${q.description || '—'}

---

## 2. Contexte

**Secteur d'activité :** ${q.secteur || '—'}

**Localisation :** ${q.localisation || '—'}

**Stade du projet :** ${q.stade || '—'}

---

## 3. Marché et offre

**Clientèle cible et zone de commercialisation :**
${q.marche || '—'}

**Produits ou services principaux :**
${q.offre || '—'}

---

## 4. Dimensions économiques

**Investissement total estimé :** ${q.investissement || '—'}

**Plan de financement :**
${q.financement || '—'}

**Emplois directs prévus :** ${q.emplois || '—'}

---

## 5. Finalité

**Objectif du business plan :** ${q.objectif || '—'}

**Contraintes ou risques déjà identifiés :**
${q.risques || '—'}
`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [casName, setCasName] = useState('');
  const [mode, setMode]       = useState('upload');
  const [files, setFiles]     = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [qForm, setQForm]     = useState(EMPTY_FORM);
  const fileRef = useRef(null);

  function setQ(key, val) { setQForm(prev => ({ ...prev, [key]: val })); }

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
    const cas = casName.trim();
    if (!cas) { setError('Nom du cas obligatoire.'); return; }
    if (mode === 'questions' && !qForm.description.trim()) {
      setError('La description de l\'activité est obligatoire.'); return;
    }

    setLoading(true);

    // 1. Créer le cas
    const createRes = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cas }),
    });
    if (!createRes.ok) {
      setError(await createRes.text() || 'Erreur lors de la création du cas.');
      setLoading(false);
      return;
    }

    // 2a. Mode upload : envoyer les fichiers
    if (mode === 'upload' && files.length > 0) {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const uploadRes = await fetch(`/api/upload-brief/${cas}`, { method: 'POST', body: fd });
      if (!uploadRes.ok) {
        setError(await uploadRes.text() || "Erreur lors de l'upload.");
        setLoading(false);
        return;
      }
    }

    // 2b. Mode questionnaire : sauvegarder les réponses
    if (mode === 'questions') {
      const content = formatResponses(cas, qForm);
      const repRes = await fetch(`/api/reponses/${cas}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!repRes.ok) {
        setError(await repRes.text() || 'Erreur lors de la sauvegarde des réponses.');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push(`/projects/${cas}`);
  }

  // ── Champs du formulaire questionnaire ───────────────────────────
  const inputCls  = 'w-full px-3 py-2.5 bg-[#f8f8f5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid';
  const labelCls  = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionHd = 'text-xs font-bold text-eg-dark uppercase tracking-widest mb-3 pt-1';

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Nouveau projet</h1>
      <p className="text-sm text-gray-500 mb-6">Créez un cas pilote et fournissez le brief pour démarrer la chaîne d'agents.</p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Nom du cas ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Identifiant du cas <span className="text-eg-mid">*</span>
          </label>
          <input
            type="text"
            value={casName}
            onChange={e => setCasName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="ex. manden-mining"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1.5">Minuscules et tirets uniquement (ex. metalerie-guinee)</p>
        </div>

        {/* ── Mode de brief ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Mode de brief</label>
          <div className="flex gap-2 mb-4">
            {[['upload', 'Déposer des fichiers'], ['questions', 'Questionnaire de cadrage']].map(([v, l]) => (
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

          {/* Upload */}
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
                <input ref={fileRef} type="file" multiple accept=".md,.txt,.pdf,.docx" className="hidden"
                  onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                <svg className="mx-auto mb-2 text-gray-300" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-gray-500">Glissez vos fichiers ici ou <span className="text-eg-mid font-semibold">parcourir</span></p>
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

          {/* Questionnaire */}
          {mode === 'questions' && (
            <div className="space-y-5">
              <p className="text-xs text-gray-500 bg-[#f8faf7] border border-eg-mid/20 rounded-lg px-3 py-2.5">
                Remplissez les champs ci-dessous. Vos réponses seront transmises à l'agent de cadrage (T2) qui produira la fiche projet structurée.
              </p>

              {/* Section 1 */}
              <div>
                <p className={sectionHd}>1 — Identité du projet</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Nom officiel du projet ou de l'entreprise <span className="text-gray-400 font-normal">(facultatif si déjà dans l'identifiant)</span></label>
                    <input type="text" value={qForm.nomProjet} onChange={e => setQ('nomProjet', e.target.value)} placeholder="ex. Manden Mining Corporation" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Promoteur(s) — nom, fonction, expérience clé</label>
                    <textarea value={qForm.promoteur} onChange={e => setQ('promoteur', e.target.value)} rows={2} placeholder="ex. Mamadou Kouyaté, ingénieur industriel, 12 ans dans le secteur gazier" className={inputCls + ' resize-none'} />
                  </div>
                  <div>
                    <label className={labelCls}>Description de l'activité <span className="text-eg-mid">*</span></label>
                    <textarea value={qForm.description} onChange={e => setQ('description', e.target.value)} rows={3} placeholder="Décrivez en 2-3 phrases l'activité principale, le modèle et la valeur ajoutée" className={inputCls + ' resize-none'} />
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <p className={sectionHd}>2 — Contexte</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Secteur d'activité principal</label>
                    <input type="text" value={qForm.secteur} onChange={e => setQ('secteur', e.target.value)} placeholder="ex. Industrie gazière, Agro-alimentaire, BTP, Services financiers…" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Localisation</label>
                    <input type="text" value={qForm.localisation} onChange={e => setQ('localisation', e.target.value)} placeholder="ex. Kankan, Haute-Guinée — zone industrielle" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Stade du projet</label>
                    <select value={qForm.stade} onChange={e => setQ('stade', e.target.value)} className={inputCls}>
                      <option value="">— Sélectionner —</option>
                      {STADES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <p className={sectionHd}>3 — Marché et offre</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Clientèle cible et zone de commercialisation</label>
                    <textarea value={qForm.marche} onChange={e => setQ('marche', e.target.value)} rows={2} placeholder="ex. Ménages et artisans de la région de Kankan, distributeurs régionaux" className={inputCls + ' resize-none'} />
                  </div>
                  <div>
                    <label className={labelCls}>Produits ou services principaux</label>
                    <textarea value={qForm.offre} onChange={e => setQ('offre', e.target.value)} rows={2} placeholder="ex. Bouteilles de gaz butane 6 kg et 12 kg, service de remplissage à la demande" className={inputCls + ' resize-none'} />
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div>
                <p className={sectionHd}>4 — Dimensions économiques</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Investissement total estimé (montant + nature)</label>
                    <input type="text" value={qForm.investissement} onChange={e => setQ('investissement', e.target.value)} placeholder="ex. 2,5 Mds GNF — terrain, bâtiment, équipements de remplissage" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Plan de financement envisagé</label>
                    <textarea value={qForm.financement} onChange={e => setQ('financement', e.target.value)} rows={2} placeholder="ex. Apport promoteur 30 %, crédit bancaire 50 %, subvention 20 %" className={inputCls + ' resize-none'} />
                  </div>
                  <div>
                    <label className={labelCls}>Emplois directs prévus</label>
                    <input type="text" value={qForm.emplois} onChange={e => setQ('emplois', e.target.value)} placeholder="ex. 12 permanents, 5 saisonniers" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Section 5 */}
              <div>
                <p className={sectionHd}>5 — Finalité</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Objectif principal du business plan</label>
                    <select value={qForm.objectif} onChange={e => setQ('objectif', e.target.value)} className={inputCls}>
                      <option value="">— Sélectionner —</option>
                      {OBJECTIFS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Contraintes ou risques déjà identifiés</label>
                    <textarea value={qForm.risques} onChange={e => setQ('risques', e.target.value)} rows={2} placeholder="ex. Approvisionnement en gaz importé, dépendance au dollar, concurrence informelle" className={inputCls + ' resize-none'} />
                  </div>
                </div>
              </div>
            </div>
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
