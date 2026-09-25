'use client';
import { useState } from 'react';
import Link from 'next/link';

function StatusBadge({ status }) {
  if (!status || status.type === 'empty') return (
    <span className="text-xs text-gray-300">Non commencé</span>
  );
  if (status.type === 'complete') return (
    <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      Chaîne complète
    </span>
  );
  if (status.type === 'fail') return (
    <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      {status.done}/{status.total} · Échec
    </span>
  );
  return (
    <span className="text-xs font-semibold text-eg-mid bg-eg-mid/10 border border-eg-mid/20 px-2 py-0.5 rounded-full">
      {status.done}/{status.total} étapes
    </span>
  );
}

export default function ProjectsList({ initialProjects }) {
  const [projects, setProjects]   = useState(initialProjects);
  const [selected, setSelected]   = useState(new Set());
  const [deleting, setDeleting]   = useState(false);

  function toggleSelect(slug) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === projects.length) setSelected(new Set());
    else setSelected(new Set(projects.map(p => p.slug)));
  }

  async function deleteSelected() {
    if (!selected.size) return;
    const slugs   = [...selected];
    const plural  = slugs.length > 1;
    if (!confirm(`Supprimer ${plural ? `ces ${slugs.length} projets` : 'ce projet'} ? Cette action est irréversible.`)) return;
    setDeleting(true);
    for (const slug of slugs) {
      try { await fetch(`/api/cases/${slug}`, { method: 'DELETE' }); } catch {}
    }
    setProjects(prev => prev.filter(p => !selected.has(p.slug)));
    setSelected(new Set());
    setDeleting(false);
  }

  async function deleteSingle(slug, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Supprimer "${slug}" ? Cette action est irréversible.`)) return;
    try {
      await fetch(`/api/cases/${slug}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.slug !== slug));
      setSelected(prev => { const next = new Set(prev); next.delete(slug); return next; });
    } catch {}
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
        <p className="text-3xl mb-3">📋</p>
        <p>Aucun projet. Créez votre premier cas pilote.</p>
      </div>
    );
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-eg-dark/5 border border-eg-dark/20 rounded-xl px-4 py-2.5 mb-3">
          <span className="text-sm text-gray-700 font-medium">
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="text-xs px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Suppression…' : 'Supprimer la sélection'}
          </button>
        </div>
      )}

      {projects.length > 1 && (
        <div className="flex items-center gap-3 px-1 pb-2">
          <input
            type="checkbox"
            checked={selected.size === projects.length}
            ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < projects.length; }}
            onChange={toggleAll}
            className="w-3.5 h-3.5 accent-eg-mid cursor-pointer"
          />
          <span className="text-xs text-gray-400">Tout sélectionner</span>
        </div>
      )}

      <ul className="space-y-2">
        {projects.map(({ slug, name, createdAt, status }) => (
          <li key={slug} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has(slug)}
              onChange={() => toggleSelect(slug)}
              className="w-3.5 h-3.5 accent-eg-mid cursor-pointer shrink-0"
            />
            <Link
              href={`/projects/${slug}`}
              className="flex-1 flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200 rounded-xl hover:border-eg-mid hover:shadow-sm transition-all group"
            >
              <div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-eg-dark">
                  {name || slug}
                </span>
                <span className="block text-xs text-gray-400 mt-0.5">
                  {new Date(createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={status} />
                <span className="text-xs text-gray-400 group-hover:text-eg-mid transition-colors">Voir →</span>
              </div>
            </Link>
            <button
              onClick={e => deleteSingle(slug, e)}
              title="Supprimer ce projet"
              className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
