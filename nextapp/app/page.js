import { auth }      from '@/lib/auth.js';
import { redirect }   from 'next/navigation';
import LoginForm      from '@/components/LoginForm.js';

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <div className="flex min-h-screen">
      {/* Panneau gauche — branding */}
      <div className="hidden md:flex w-1/2 flex-col justify-between px-12 py-12 bg-eg-dark">
        <div>
          <p className="text-white font-bold text-base">Efficience Globale</p>
          <p className="text-white/50 text-xs mt-0.5">Chaîne business plan IA</p>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white leading-snug">
            La production de business plans aux standards tier-1,<br />
            au même endroit.
          </h1>
        </div>
        <p className="text-white/35 text-xs">Accès réservé aux collaborateurs EG.</p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex w-full md:w-1/2 flex-col justify-center items-center px-8 py-12 bg-[#f0f0eb]">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Connexion</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
