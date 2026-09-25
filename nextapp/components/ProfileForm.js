'use client';
import { useState } from 'react';

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <p className={`text-xs px-3 py-2 rounded-lg border ${msg.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
      {msg.text}
    </p>
  );
}

export default function ProfileForm({ user }) {
  const [name,        setName]        = useState(user.name || '');
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [msgInfo,     setMsgInfo]     = useState(null);
  const [msgPwd,      setMsgPwd]      = useState(null);
  const [saving,      setSaving]      = useState(false);

  async function saveInfo(e) {
    e.preventDefault();
    setSaving(true); setMsgInfo(null);
    try {
      const r = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name }),
      });
      if (r.ok) {
        setMsgInfo({ ok: true, text: 'Nom mis à jour.' });
      } else {
        setMsgInfo({ ok: false, text: await r.text() });
      }
    } catch {
      setMsgInfo({ ok: false, text: 'Erreur réseau.' });
    }
    setSaving(false);
  }

  async function savePwd(e) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setMsgPwd({ ok: false, text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (newPwd.length < 8) {
      setMsgPwd({ ok: false, text: 'Le mot de passe doit comporter au moins 8 caractères.' });
      return;
    }
    setSaving(true); setMsgPwd(null);
    try {
      const r = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      if (r.ok) {
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        setMsgPwd({ ok: true, text: 'Mot de passe mis à jour.' });
      } else {
        setMsgPwd({ ok: false, text: await r.text() });
      }
    } catch {
      setMsgPwd({ ok: false, text: 'Erreur réseau.' });
    }
    setSaving(false);
  }

  return (
    <>
      {/* Informations */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Informations</h2>
        <form onSubmit={saveInfo} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom d'affichage</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Votre nom"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-eg-mid"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <p className="text-sm text-gray-500 border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
              {user.email}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rôle</label>
            <p className="text-sm text-gray-500 border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
              {user.role === 'ADMIN' ? 'Administrateur' : 'Membre'}
            </p>
          </div>
          <Msg msg={msgInfo} />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-eg-mid text-white text-sm font-semibold rounded-lg hover:bg-eg-muted transition-colors disabled:opacity-50"
          >
            Enregistrer
          </button>
        </form>
      </div>

      {/* Mot de passe */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Modifier le mot de passe</h2>
        <form onSubmit={savePwd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-eg-mid"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-eg-mid"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-eg-mid"
            />
          </div>
          <Msg msg={msgPwd} />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-eg-mid text-white text-sm font-semibold rounded-lg hover:bg-eg-muted transition-colors disabled:opacity-50"
          >
            Mettre à jour le mot de passe
          </button>
        </form>
      </div>
    </>
  );
}
