'use client';
import { useState }    from 'react';
import Sidebar         from './Sidebar.js';

export default function AppShell({ role, name, email, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop — toujours visible ≥ md */}
      <div className="hidden md:flex">
        <Sidebar role={role} name={name} email={email} onClose={() => {}} />
      </div>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar mobile — drawer slide-in */}
      <div className={`fixed top-0 left-0 h-full z-40 md:hidden transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar role={role} name={name} email={email} onClose={() => setOpen(false)} />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-eg-dark text-white shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <img src="/eg-logo.svg" alt="Efficience Globale" height="28" style={{ height: '28px', filter: 'brightness(0) invert(1)' }} />
          <div className="w-8" /> {/* spacer */}
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
