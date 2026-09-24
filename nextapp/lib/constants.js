import path from 'path';
import fs   from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// nextapp/lib/ → nextapp/ → eg-agents/
const NEXTAPP_DIR = path.resolve(__dirname, '..');
export const AGENTS_DIR    = path.resolve(NEXTAPP_DIR, '..');
export const LIVRABLES_DIR = path.join(AGENTS_DIR, 'livrables');
export const TMP_DIR       = path.join(AGENTS_DIR, 'tmp');
const AGENTS_PROMPTS_DIR   = path.join(AGENTS_DIR, '.claude', 'agents');

export const STEP_MAX_TOKENS = {
  'cadrage-t1':        8192,
  'cadrage-t2':        16000,
  'analyste-marche':   16000,
  'modele-economique': 16000,
  'modele-financier':  16000,
  'audit-final':       16000,
  'redacteur':         32000,
};

export const CHAIN_ORDER = [
  'cadrage-t1', 'cadrage-t2',
  'analyste-marche', 'modele-economique',
  'modele-financier', 'audit-final', 'redacteur',
];

export const STEP_CMA_AGENTS = {
  'cadrage-t1':        () => process.env.CMA_AGENT_CADRAGE_T1,
  'cadrage-t2':        () => process.env.CMA_AGENT_CADRAGE_T2,
  'analyste-marche':   () => process.env.CMA_AGENT_ANALYSTE_MARCHE,
  'modele-economique': () => process.env.CMA_AGENT_MODELE_ECONOMIQUE,
  'modele-financier':  () => process.env.CMA_AGENT_MODELE_FINANCIER,
  'audit-final':       () => process.env.CMA_AGENT_AUDIT_FINAL,
  'redacteur':         () => process.env.CMA_AGENT_REDACTEUR,
};

const STEP_AGENT_FILES = {
  'cadrage-t1':        'cadrage.md',
  'cadrage-t2':        'cadrage.md',
  'analyste-marche':   'analyste-marche.md',
  'modele-economique': 'modele-economique.md',
  'modele-financier':  'modele-financier.md',
  'audit-final':       'audit-final.md',
  'redacteur':         'redacteur.md',
};

const NO_QUESTION = `

RÈGLES D'EXÉCUTION IMPÉRATIVES :
- Utilise FileWrite pour écrire chaque fichier de sortie. C'est la seule façon de produire le livrable.
- Écris TOUT le contenu d'un fichier en UN SEUL appel FileWrite. Ne divise jamais un fichier en plusieurs appels — chaque appel écrase le précédent.
- Ne génère PAS le contenu dans ta réponse textuelle — écris-le directement avec FileWrite.
- Après avoir écrit un fichier avec FileWrite, NE le relis PAS et ne fais pas d'auto-contrôle. La tâche est terminée dès que FileWrite a répondu.
- Ne pose aucune question. Produis le livrable immédiatement.`;

export const AGENT_COMMANDS = {
  'cadrage-t1': (cas) =>
    `Temps 1 — Questionnaire. Cas : ${cas}.
1. Tente de lire les fichiers dans livrables/${cas}/00-brief/ avec FileGlob puis FileRead. Si le dossier est vide ou si FileRead retourne "Fichier introuvable", CONTINUE sans brief — c'est le mode questionnaire prévu, ne t'arrête pas.
2. Produis le questionnaire structuré (20 à 30 questions maximum). Qu'un brief soit présent ou non, le questionnaire DOIT obligatoirement couvrir ces domaines : identité et porteurs du projet, description technique, marché cible et clients, concurrence et positionnement, modèle de revenus, investissements et financement, aspects juridiques et réglementaires, ressources humaines, calendrier et étapes clés, risques identifiés. Ne pose que les questions dont la réponse est absente du brief.
3. En-tête OBLIGATOIRE en première ligne du fichier (copier exactement ce format) :
   Agent : Cadrage | Version prompt : 1.0 | Date : <date du jour>
   Cas pilote : ${cas} | Entrées : <liste des fichiers lus, ou "aucun brief — mode questionnaire autonome">
4. Écris le résultat avec FileWrite dans livrables/${cas}/01-cadrage/questionnaire-v1.md.
${NO_QUESTION}`,

  'cadrage-t2': (cas) =>
    `Temps 2 — Fiche projet. Cas : ${cas}.
1. Lis TOUS les fichiers dans livrables/${cas}/00-brief/ avec FileRead.
2. Lis livrables/${cas}/01-cadrage/questionnaire-v1.md avec FileRead (questionnaire du Temps 1).
3. Lis livrables/${cas}/01-cadrage/reponses-questionnaire.md si présent (réponses client). Si absent, déduis les informations depuis le brief et balise [HYPOTHÈSE].
4. Produis les trois livrables et écris-les avec FileWrite :
   - livrables/${cas}/01-cadrage/fiche-projet-v1.md
   - livrables/${cas}/01-cadrage/resume-executif-v1.md
   - livrables/${cas}/01-cadrage/note-ecarts-v1.md
${NO_QUESTION}`,

  'analyste-marche': (cas) =>
    `Analyste marché. Cas : ${cas}.
1. Lis TOUS les fichiers dans livrables/${cas}/00-brief/ avec FileRead.
2. Lis livrables/${cas}/01-cadrage/fiche-projet-v1.md avec FileRead.
3. Produis l'étude de marché complète (PESTEL, TAM/SAM/SOM, Porter, segmentation).
4. Écris le résultat avec FileWrite dans livrables/${cas}/02-marche/etude-marche-v1.md.
${NO_QUESTION}`,

  'modele-economique': (cas) =>
    `Modèle économique. Cas : ${cas}.
1. Lis livrables/${cas}/01-cadrage/fiche-projet-v1.md avec FileRead.
2. Lis livrables/${cas}/02-marche/etude-marche-v1.md avec FileRead.
3. Produis le modèle économique structuré en respectant ces contraintes de longueur :
   - BMC : chaque bloc en 3 à 5 lignes. Utilise des tableaux pour les données chiffrées, pas de prose longue.
   - VPC : 2 à 3 lignes par composante.
   - Hypothèses de revenus, coûts, RH, CapEx, BFR : tableaux avec colonnes Poste / Montant / Tag / Justification.
   - Section 9 Synthèse : tableau récapitulatif uniquement, pas de narration.
   Sois synthétique et structuré — le livrable doit être factuel, dense, balisé, sans développements narratifs.
4. Écris le résultat avec FileWrite dans livrables/${cas}/03-modele-economique/modele-economique-v1.md.
${NO_QUESTION}`,

  'modele-financier': (cas) =>
    `Modèle financier. Cas : ${cas}.
1. Lis livrables/${cas}/01-cadrage/fiche-projet-v1.md avec FileRead.
2. Lis livrables/${cas}/02-marche/etude-marche-v1.md avec FileRead.
3. Lis livrables/${cas}/03-modele-economique/modele-economique-v1.md avec FileRead.
4. Produis les projections financières 5 ans en format dense et tabulaire :
   - P&L, bilan, cash-flow : tableaux markdown avec colonnes An1 / An2 / An3 / An4 / An5. Pas de prose explicative par ligne.
   - Indicateurs (TRI, VAN, DSCR, payback) : tableau récapitulatif, 1 ligne par indicateur.
   - Sensibilité : tableau 3 scénarios × indicateurs clés uniquement.
   - Section hypothèses et section points de vigilance : bullets concis, pas de développements.
   Sois synthétique — données chiffrées prioritaires sur le texte narratif.
5. Écris le résultat avec FileWrite dans livrables/${cas}/04-modele-financier/modele-financier-v1.md.
${NO_QUESTION}`,

  'audit-final': (cas) =>
    `Audit final. Cas : ${cas}.
1. Lis tous les livrables avec FileRead : livrables/${cas}/01-cadrage/, livrables/${cas}/02-marche/, livrables/${cas}/03-modele-economique/, livrables/${cas}/04-modele-financier/.
2. Audite la cohérence inter-agents, le sourcing, et la conformité aux standards EG.
3. Écris le rapport d'audit avec FileWrite dans livrables/${cas}/05-audit/rapport-audit-v1.md.
${NO_QUESTION}`,

  'redacteur': (cas) =>
    `Rédacteur business plan. Cas : ${cas}.
1. Lis dans l'ordre avec FileRead :
   - livrables/${cas}/01-cadrage/resume-executif-v1.md
   - livrables/${cas}/01-cadrage/fiche-projet-v1.md
   - livrables/${cas}/02-marche/etude-marche-v1.md
   - livrables/${cas}/03-modele-economique/modele-economique-v1.md
   - livrables/${cas}/04-modele-financier/modele-financier-v1.md
   - livrables/${cas}/05-audit/rapport-audit-v1.md
2. Écris avec FileWrite la synthèse narrative dans livrables/${cas}/06-livraison/business-plan-synthese-v1.md.
   Structure : (1) Résumé exécutif, (2) Projet et porteurs, (3) Contexte réglementaire, (4) Marché (PESTEL synthétique + TAM/SAM/SOM), (5) Modèle économique, (6) Projections financières 5 ans avec tableaux, (7) Points d'attention et prochaines étapes.
   Ton sobre, professionnel, sans balises taxonomiques visibles. Remplace [HYPOTHÈSE] par "selon les estimations disponibles". Longueur cible : 12 à 15 pages denses.
3. Écris avec FileWrite un index des annexes dans livrables/${cas}/06-livraison/business-plan-annexes-v1.md.
   Cet index liste les 5 livrables techniques (chemins de fichiers + titre + date + résumé en 3 lignes chacun). Ne reproduis PAS leur contenu intégral — les fichiers source sont déjà disponibles.
${NO_QUESTION}`,
};

export function getLivrablesForStep(cas, step) {
  const b = path.join(LIVRABLES_DIR, cas);
  const map = {
    'cadrage-t1':        [path.join(b, '01-cadrage', 'questionnaire-v1.md')],
    'cadrage-t2':        [path.join(b, '01-cadrage', 'fiche-projet-v1.md'), path.join(b, '01-cadrage', 'resume-executif-v1.md'), path.join(b, '01-cadrage', 'note-ecarts-v1.md')],
    'analyste-marche':   [path.join(b, '02-marche', 'etude-marche-v1.md')],
    'modele-economique': [path.join(b, '03-modele-economique', 'modele-economique-v1.md')],
    'modele-financier':  [path.join(b, '04-modele-financier', 'modele-financier-v1.md')],
    'audit-final':       [path.join(b, '05-audit', 'rapport-audit-v1.md')],
    'redacteur':         [path.join(b, '06-livraison', 'business-plan-synthese-v1.md')],
  };
  return map[step] || [];
}

export function getLivrablesRelPathsForStep(cas, step) {
  const b = `livrables/${cas}`;
  const map = {
    'cadrage-t1':        [`${b}/01-cadrage/questionnaire-v1.md`],
    'cadrage-t2':        [`${b}/01-cadrage/fiche-projet-v1.md`, `${b}/01-cadrage/resume-executif-v1.md`, `${b}/01-cadrage/note-ecarts-v1.md`],
    'analyste-marche':   [`${b}/02-marche/etude-marche-v1.md`],
    'modele-economique': [`${b}/03-modele-economique/modele-economique-v1.md`],
    'modele-financier':  [`${b}/04-modele-financier/modele-financier-v1.md`],
    'audit-final':       [`${b}/05-audit/rapport-audit-v1.md`],
    'redacteur':         [`${b}/06-livraison/business-plan-synthese-v1.md`],
  };
  return map[step] || [];
}

function loadAgentPrompt(agentFile) {
  const fp = path.join(AGENTS_PROMPTS_DIR, agentFile);
  if (!fs.existsSync(fp)) return '';
  return fs.readFileSync(fp, 'utf-8').replace(/^---\n[\s\S]*?\n---\n\n?/, '').trim();
}

export function buildSystemPrompt(step) {
  const agentFile  = STEP_AGENT_FILES[step];
  const agentPart  = agentFile ? loadAgentPrompt(agentFile) : '';
  const claudeMd   = path.join(AGENTS_DIR, 'CLAUDE.md');
  const projectCtx = fs.existsSync(claudeMd) ? fs.readFileSync(claudeMd, 'utf-8') : '';
  return ['<contexte_projet>', projectCtx, '</contexte_projet>', '', agentPart].filter(Boolean).join('\n');
}
