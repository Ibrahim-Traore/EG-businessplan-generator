/**
 * setup-cma.js — Configuration initiale des agents CMA pour EG-AGENTS
 * Crée 7 agents versionnés + 1 environnement cloud sur platform.anthropic.com
 * et enregistre les IDs dans nextapp/.env.local
 *
 * Usage : node scripts/setup-cma.js
 */

'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const fs        = require('fs');
const path      = require('path');

// Chargement .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key?.trim() && !key.trim().startsWith('#'))
      process.env[key.trim()] = val.join('=').trim();
  });
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CUSTOM_TOOLS = [
  { type: 'custom', name: 'FileRead',
    description: 'Lit un fichier du projet EG-AGENTS (chemin relatif à eg-agents/ ou absolu).',
    input_schema: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] } },
  { type: 'custom', name: 'FileWrite',
    description: 'Écrit du contenu dans un fichier du projet EG-AGENTS. Crée les dossiers parents si nécessaire.',
    input_schema: { type: 'object', properties: { file_path: { type: 'string' }, content: { type: 'string' } }, required: ['file_path', 'content'] } },
  { type: 'custom', name: 'FileGlob',
    description: 'Liste les fichiers correspondant à un pattern glob dans le projet EG-AGENTS.',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } },
];

const PERPLEXITY_TOOL = {
  type: 'custom', name: 'PerplexitySearch',
  description: 'Recherche via Perplexity AI avec citations. Pour données marché, stats sectorielles, actualité économique guinéenne.',
  input_schema: { type: 'object', properties: {
    query: { type: 'string' },
    focus: { type: 'string', enum: ['web', 'academic', 'news', 'finance'] },
  }, required: ['query'] },
};

const TOOLS_FILES_ONLY = CUSTOM_TOOLS;
const TOOLS_BASH = [
  { type: 'agent_toolset_20260401', configs: [
    { name: 'read', enabled: false }, { name: 'write', enabled: false },
    { name: 'edit', enabled: false }, { name: 'glob',  enabled: false },
    { name: 'grep', enabled: false }, { name: 'web_search', enabled: false },
    { name: 'web_fetch', enabled: false },
  ]},
  ...CUSTOM_TOOLS,
];
const TOOLS_WEB_BASH = [
  { type: 'agent_toolset_20260401', configs: [
    { name: 'read', enabled: false }, { name: 'write', enabled: false },
    { name: 'edit', enabled: false }, { name: 'glob',  enabled: false },
    { name: 'grep', enabled: false },
  ]},
  PERPLEXITY_TOOL,
  ...CUSTOM_TOOLS,
];

const AGENT_SPECS = [
  { key: 'CADRAGE_T1',        name: 'EG-Cadrage-T1',        model: 'claude-haiku-4-5', tools: TOOLS_FILES_ONLY },
  { key: 'CADRAGE_T2',        name: 'EG-Cadrage-T2',        model: 'claude-sonnet-5',  tools: TOOLS_FILES_ONLY },
  { key: 'ANALYSTE_MARCHE',   name: 'EG-Analyste-Marche',   model: 'claude-sonnet-5',  tools: TOOLS_WEB_BASH   },
  { key: 'MODELE_ECONOMIQUE', name: 'EG-Modele-Economique', model: 'claude-sonnet-5',  tools: TOOLS_BASH       },
  { key: 'MODELE_FINANCIER',  name: 'EG-Modele-Financier',  model: 'claude-sonnet-5',  tools: TOOLS_BASH       },
  { key: 'AUDIT_FINAL',       name: 'EG-Audit-Final',       model: 'claude-opus-5',    tools: TOOLS_FILES_ONLY },
  { key: 'REDACTEUR',         name: 'EG-Redacteur',         model: 'claude-sonnet-5',  tools: TOOLS_FILES_ONLY },
];

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY manquant dans .env.local'); process.exit(1); }

  let envId = process.env.CMA_ENV_ID;
  if (envId) {
    console.log(`Environnement existant réutilisé : ${envId}`);
  } else {
    const env = await client.beta.environments.create({ name: 'eg-agents-poc', config: { type: 'cloud', networking: { type: 'unrestricted' } } });
    envId = env.id;
    console.log(`Environnement créé : ${envId}`);
  }

  const created = {};
  for (const spec of AGENT_SPECS) {
    const agent = await client.beta.agents.create({ name: spec.name, model: spec.model, tools: spec.tools });
    created[spec.key] = agent.id;
    console.log(`✓ ${spec.name} [${agent.id}]`);
  }

  // Mise à jour .env.local
  let content = fs.readFileSync(envPath, 'utf-8');
  content = content.replace(/CMA_ENV_ID=.*/,                `CMA_ENV_ID=${envId}`);
  for (const spec of AGENT_SPECS) {
    const rx = new RegExp(`CMA_AGENT_${spec.key}=.*`);
    content = content.replace(rx, `CMA_AGENT_${spec.key}=${created[spec.key]}`);
  }
  fs.writeFileSync(envPath, content);
  console.log('\n✓ .env.local mis à jour. Relancez npm run dev.');
}

main().catch(err => { console.error(err.message); process.exit(1); });
