'use client';
import Link        from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/dashboard', label: 'Nouveau projet' },
  { href: '/projects',  label: 'Mes projets'   },
  { href: '/profile',   label: 'Profil'         },
];

function initials(name, email) {
  const source = name || email || '?';
  return source
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar({ role, name, email }) {
  const path = usePathname();
  const ini  = initials(name, email);
  const displayName = name || email || '—';

  return (
    <aside className="w-60 h-screen flex flex-col bg-eg-dark text-white shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <img
          src="/eg-logo.svg"
          alt="Efficience Globale"
          width="140"
          height="58"
          style={{ filter: 'brightness(0) invert(1)', maxWidth: '140px' }}
        />
        <p className="text-[10px] text-white/40 mt-2 tracking-wide">Chaîne business plan IA</p>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-eg-mid text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </Link>
          );
        })}

        {role === 'ADMIN' && (
          <div className="pt-5">
            <p className="px-3 pb-1.5 text-[10px] font-semibold text-white/35 uppercase tracking-widest">
              Administration
            </p>
            <Link
              href="/admin/users"
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                path === '/admin/users'
                  ? 'bg-eg-mid text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              Utilisateurs
            </Link>
          </div>
        )}
      </nav>

      {/* Utilisateur + Déconnexion — tout en bas */}
      <div className="px-3 py-4 border-t border-white/10 shrink-0 space-y-3">
        {/* Avatar + nom */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-eg-mid flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
            {ini}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate leading-tight">{displayName}</p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {role === 'ADMIN' ? 'Administrateur' : 'Membre'}
            </p>
          </div>
        </div>
        {/* Bouton déconnexion */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full px-3 py-2 rounded-lg text-sm text-white/60 border border-white/15 hover:bg-white/10 hover:text-white transition-colors text-left"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
