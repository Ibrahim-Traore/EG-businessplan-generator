import './globals.css';

export const metadata = {
  title: 'EG-Agents — Business Plan',
  description: 'Chaîne de production de business plans — Efficience Globale',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
