'use client';
import { useState }  from 'react';
import { signIn }    from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError('Identifiants incorrects.'); return; }
    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          Adresse e-mail <span className="text-eg-mid">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-eg-mid/40 focus:border-eg-mid"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-eg-mid text-white text-sm font-semibold rounded-lg hover:bg-eg-muted transition-colors disabled:opacity-60 mt-2"
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
