'use client';
import { useState, useEffect } from 'react';

export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('CLIENT');
  const [msg,      setMsg]      = useState('');
  const [err,      setErr]      = useState('');

  async function load() {
    const r = await fetch('/api/admin/users');
    if (r.ok) setUsers(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (r.ok) {
      setMsg('Utilisateur créé.');
      setName(''); setEmail(''); setPassword(''); setRole('CLIENT');
      load();
    } else {
      setErr(await r.text() || 'Erreur.');
    }
  }

  async function del(id) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Gestion des utilisateurs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Créez et gérez les accès à la plateforme.</p>
      </div>

      {/* Formulaire création */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Créer un utilisateur</h2>
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom complet</label>
              <input
                value={name} onChange={e => setName(e.target.value)} required
                placeholder="Malick Soumah"
                className="w-full px-3 py-2.5 bg-[#f8f8f5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Adresse e-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="m.soumah@efficienceglobale.com"
                className="w-full px-3 py-2.5 bg-[#f8f8f5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mot de passe</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 bg-[#f8f8f5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rôle</label>
              <select
                value={role} onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f8f8f5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid"
              >
                <option value="CLIENT">CLIENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          {msg && <p className="text-xs text-green-600">{msg}</p>}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button
            type="submit"
            className="px-5 py-2 bg-eg-mid text-white text-sm font-semibold rounded-lg hover:bg-eg-muted transition-colors shadow-sm"
          >
            Créer
          </button>
        </form>
      </div>

      {/* Table — scroll horizontal sur mobile */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-[#f8f8f5] border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#f8f8f5] transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      u.role === 'ADMIN' ? 'bg-eg-dark text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => del(u.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
