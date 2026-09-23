/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  async rewrites() {
    return [
      // Exposer eg-logo.png depuis le dossier racine eg-agents/
      { source: '/eg-logo.png', destination: '/api/static/eg-logo' },
    ];
  },
};

export default nextConfig;
