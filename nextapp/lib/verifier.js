import path from 'path';
import { getLivrablesRelPathsForStep } from './constants.js';
import { storageRead, storageWrite }   from './storage.js';

const VERIFICATION_SCHEMAS = {

  'cadrage-t1': {
    label: 'Questionnaire de cadrage',
    criteria: [
      'Le fichier questionnaire-v1.md est non vide (> 500 caractères)',
      'Au moins 8 questions distinctes sont formulées',
      'Les questions couvrent : porteur, activité, marché, concurrence, équipe, financement',
      'Le document porte un en-tête avec agent, version et cas pilote',
    ],
  },

  'cadrage-t2': {
    label: "Fiche projet + résumé exécutif + note d'écarts",
    criteria: [
      'Le fichier fiche-projet-v1.md contient au moins 8 des 10 sections attendues',
      'Le résumé exécutif (resume-executif-v1.md) est présent et couvre contexte, enjeu, objectif',
      "La note d'écarts (note-ecarts-v1.md) liste explicitement les hypothèses et informations manquantes",
      'Les données non confirmées sont balisées [HYPOTHÈSE] ou [À CONFIRMER]',
      'Aucune contradiction interne entre les trois documents',
    ],
  },

  'analyste-marche': {
    label: 'Étude de marché',
    criteria: [
      "L'analyse PESTEL est présente avec au moins 4 dimensions développées",
      "L'estimation TAM/SAM/SOM est présente avec double approche (top-down + bottom-up)",
      'Les 5 forces de Porter sont analysées',
      'Les données chiffrées sont sourcées ou balisées [À CONFIRMER] / [HYPOTHÈSE]',
      'Le contexte guinéen est explicitement intégré (acteurs locaux, données INS/BAD/Banque mondiale)',
    ],
  },

  'modele-economique': {
    label: 'Modèle économique',
    criteria: [
      'Le Business Model Canvas est complété sur les 9 blocs',
      'La Value Proposition Canvas est présente',
      "Les hypothèses de revenus sont chiffrées et cohérentes avec l'étude de marché",
      'Les hypothèses de coûts (RH, CapEx, BFR) sont détaillées et chiffrées',
      'Pas de contradiction majeure avec la fiche projet ou l\'étude de marché',
    ],
  },

  'modele-financier': {
    label: 'Projections financières',
    criteria: [
      'Le compte de résultat (P&L) est présent sur 5 ans minimum',
      'Le bilan prévisionnel est présent et articulé avec le P&L',
      'Le tableau de flux de trésorerie (cash-flow) est présent',
      'Les indicateurs TRI, VAN, DSCR et délai de retour sont calculés',
      "L'analyse de sensibilité présente au moins 3 scénarios (base, optimiste, pessimiste)",
      'Les hypothèses financières sont cohérentes avec le modèle économique',
    ],
  },

  'audit-final': {
    label: "Rapport d'audit transversal",
    criteria: [
      "L'audit couvre l'ensemble des 5 livrables précédents",
      'Les contradictions inter-agents sont explicitement signalées',
      'La qualité du sourcing est évaluée (ratio données sourcées vs hypothèses)',
      'La grille qualité POC EG est renseignée (6 critères)',
      'Les points bloquants sont classés par gravité avec recommandations de correction',
    ],
  },

  'redacteur': {
    label: 'Business plan complet',
    criteria: [
      'Le fichier business-plan-synthese-v1.md fait au moins 3 000 mots',
      'La structure narrative suit : contexte → enjeu → développement → implications → recommandation',
      'Tous les livrables techniques des agents précédents sont intégrés ou référencés',
      'Le ton est sobre, professionnel, sans superlatifs ni formulations marketing',
      'Les données chiffrées sont cohérentes avec les livrables des agents précédents',
    ],
  },
};

async function readLivrablesForStep(cas, step) {
  const paths   = getLivrablesRelPathsForStep(cas, step);
  const results = [];
  for (const relPath of paths) {
    const content = await storageRead(relPath);
    if (content == null) {
      results.push({ file: path.basename(relPath), content: null, missing: true });
    } else {
      results.push({ file: path.basename(relPath), content, missing: false, length: content.length });
    }
  }
  return results;
}

export async function verifyStep(cas, step, anthropic) {
  const schema = VERIFICATION_SCHEMAS[step];
  if (!schema) throw new Error(`Aucun schéma de vérification pour l'étape : ${step}`);

  const livrables = await readLivrablesForStep(cas, step);
  const missing   = livrables.filter(l => l.missing);

  if (missing.length > 0) {
    const result = {
      cas, step,
      verdict:   'FAIL',
      timestamp: new Date().toISOString(),
      label:     schema.label,
      summary:   `Fichier(s) manquant(s) : ${missing.map(l => l.file).join(', ')}`,
      criteria:  schema.criteria.map(c => ({ criterion: c, result: 'FAIL', comment: 'Fichier absent' })),
      findings:  [`Fichier manquant : ${missing.map(l => l.file).join(', ')}`],
    };
    await saveVerificationResult(cas, step, result);
    return result;
  }

  function excerptFile(content, totalLimit = 20000) {
    if (content.length <= totalLimit) return content;
    const third  = Math.floor(totalLimit / 3);
    const mid    = Math.floor(content.length / 2);
    const start  = content.slice(0, third);
    const middle = content.slice(mid - Math.floor(third / 2), mid + Math.floor(third / 2));
    const end    = content.slice(-third);
    return `${start}\n\n[…extrait central…]\n\n${middle}\n\n[…fin du document…]\n\n${end}`;
  }

  const excerpt = livrables
    .map(l => {
      const estimatedWords = Math.round(l.length / 5.5);
      return `=== ${l.file} (${l.length} car. ≈ ${estimatedWords} mots) ===\n${excerptFile(l.content)}`;
    })
    .join('\n\n');

  const prompt = `Tu es un vérificateur qualité interne d'Efficience Globale. Ta tâche : évaluer le livrable produit par l'agent "${schema.label}" pour le cas "${cas}".

Critères à vérifier :
${schema.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Extrait du livrable :
${excerpt}

Réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant ou après) selon ce schéma :
{
  "verdict": "PASS" | "WARN" | "FAIL",
  "summary": "phrase de synthèse en français (1-2 phrases)",
  "criteria": [
    { "criterion": "...", "result": "PASS" | "WARN" | "FAIL", "comment": "..." }
  ],
  "findings": ["liste des problèmes identifiés (vide si verdict = PASS)"],
  "recommendations": ["actions correctives si verdict != PASS (vide sinon)"]
}

Règles de verdict :
- PASS : tous les critères sont satisfaits
- WARN : critères mineurs non satisfaits, le livrable est utilisable mais perfectible
- FAIL : au moins un critère majeur non satisfait, le livrable doit être corrigé avant de continuer`;

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 4096,
    system:     'Tu es un vérificateur qualité. Tu réponds UNIQUEMENT avec du JSON valide, sans texte avant ni après, sans bloc de code markdown.',
    messages:   [
      { role: 'user',      content: prompt },
      { role: 'assistant', content: '{' },
    ],
  });

  if (response.stop_reason === 'max_tokens') {
    console.warn(`[verifier] ${step} : réponse Haiku tronquée (max_tokens atteint)`);
  }

  const raw = '{' + (response.content[0]?.text || '"verdict":"WARN"}');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch { parsed = null; }

    if (!parsed) {
      parsed = {
        verdict:         'WARN',
        summary:         'Réponse du vérificateur non parseable — vérification manuelle recommandée.',
        criteria:        schema.criteria.map(c => ({ criterion: c, result: 'WARN', comment: 'Non évalué automatiquement' })),
        findings:        [],
        recommendations: [],
      };
    }
  }

  const result = {
    cas,
    step,
    verdict:   parsed.verdict   || 'WARN',
    timestamp: new Date().toISOString(),
    label:     schema.label,
    summary:   parsed.summary   || '',
    criteria:  parsed.criteria  || [],
    findings:  parsed.findings  || [],
    recommendations: parsed.recommendations || [],
    model: 'claude-haiku-4-5',
  };

  await saveVerificationResult(cas, step, result);
  return result;
}

const STEP_DIRS = {
  'cadrage-t1':        '01-cadrage',
  'cadrage-t2':        '01-cadrage',
  'analyste-marche':   '02-marche',
  'modele-economique': '03-modele-economique',
  'modele-financier':  '04-modele-financier',
  'audit-final':       '05-audit',
  'redacteur':         '06-livraison',
};

async function saveVerificationResult(cas, step, result) {
  const relPath = `livrables/${cas}/${STEP_DIRS[step] || ''}/verification-${step}.json`;
  await storageWrite(relPath, JSON.stringify(result, null, 2));
}

export async function loadVerificationResult(cas, step) {
  const relPath = `livrables/${cas}/${STEP_DIRS[step] || ''}/verification-${step}.json`;
  const content = await storageRead(relPath);
  if (!content) return null;
  try { return JSON.parse(content); }
  catch { return null; }
}

export { VERIFICATION_SCHEMAS };
