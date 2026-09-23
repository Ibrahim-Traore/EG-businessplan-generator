export const runtime = 'nodejs';

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// nextapp/app/api/static/eg-logo/ → up 5 levels → eg-agents/ → frontend/public/
const LOGO_PATHS = [
  path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'frontend', 'public', 'eg-logo.png'),
  path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'eg-logo.png'),
];

export async function GET() {
  for (const fp of LOGO_PATHS) {
    if (fs.existsSync(fp)) {
      const img = fs.readFileSync(fp);
      return new Response(img, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }
  }
  // Return a simple SVG placeholder if logo file not found
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#455F51"/><text x="10" y="26" font-family="sans-serif" font-size="14" fill="white" font-weight="bold">EG</text></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
