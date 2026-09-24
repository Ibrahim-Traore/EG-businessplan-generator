import { buildSystemPrompt, STEP_MAX_TOKENS } from './constants.js';
import { storageRead, storageWrite, storageGlob } from './storage.js';

// ─── Outils exposés à l'agent ────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'FileRead',
    description: 'Lire le contenu d\'un fichier texte',
    input_schema: {
      type: 'object',
      properties: { file_path: { type: 'string', description: 'Chemin relatif depuis la racine eg-agents/' } },
      required: ['file_path'],
    },
  },
  {
    name: 'FileWrite',
    description: 'Écrire ou créer un fichier texte',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Chemin relatif depuis la racine eg-agents/' },
        content:   { type: 'string', description: 'Contenu complet du fichier' },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'FileGlob',
    description: 'Lister les fichiers d\'un répertoire',
    input_schema: {
      type: 'object',
      properties: { pattern: { type: 'string', description: 'Chemin ou pattern glob (ex: livrables/monprojet/00-brief/)' } },
      required: ['pattern'],
    },
  },
];

// ─── Exécution d'un outil ─────────────────────────────────────────────────────
async function executeTool(name, input) {
  if (name === 'FileRead') {
    const content = await storageRead(input.file_path);
    return content ?? `Fichier introuvable : ${input.file_path}`;
  }
  if (name === 'FileWrite') {
    return await storageWrite(input.file_path, input.content);
  }
  if (name === 'FileGlob') {
    return await storageGlob(input.pattern);
  }
  return `Outil inconnu : ${name}`;
}

// ─── Contrôleurs en cours ─────────────────────────────────────────────────────
export const runningControllers = new Map();

// ─── Session agent via l'API Messages standard ────────────────────────────────
export async function runCMASession(send, { step, cas, prompt, signal, model: modelOverride }, anthropic) {
  const systemPrompt = buildSystemPrompt(step);
  const model        = modelOverride || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

  const messages = [{ role: 'user', content: prompt }];

  send({ type: 'log', text: `[AGENT] ${step} — modèle : ${model}\n` });

  let iterations = 0;
  const MAX_ITER = 15;

  while (iterations < MAX_ITER) {
    if (signal.aborted) throw new Error("Annulé par l'utilisateur");
    iterations++;

    const msgStream = anthropic.messages.stream({
      model,
      max_tokens:  STEP_MAX_TOKENS[step] || 16000,
      system:      systemPrompt,
      tools:       TOOLS,
      messages,
    });

    // Afficher le texte en temps réel pendant la génération
    msgStream.on('text', (text) => { send({ type: 'log', text }); });

    const response = await msgStream.finalMessage();

    // Fin de la conversation
    if (response.stop_reason === 'end_turn') {
      const lastText = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');
      if (lastText.includes('[ARRET]')) {
        const match = lastText.match(/\[ARRET\]\s*(.+)/);
        throw new Error(match ? match[1].trim() : "Blocage signalé par l'agent");
      }
      return;
    }

    // L'agent demande à utiliser des outils
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      // Ajouter la réponse de l'assistant au fil de messages
      messages.push({ role: 'assistant', content: response.content });

      // Exécuter chaque outil et collecter les résultats
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        send({ type: 'log', text: `\n[OUTIL] ${toolUse.name} → ${JSON.stringify(toolUse.input).slice(0, 120)}\n` });

        let result;
        try   { result = await executeTool(toolUse.name, toolUse.input); }
        catch (e) { result = `Erreur : ${e.message}`; }

        send({ type: 'log', text: `  ↳ ${String(result).slice(0, 200).replace(/\n/g, ' ')}\n` });

        toolResults.push({
          type:       'tool_result',
          tool_use_id: toolUse.id,
          content:    String(result) || '(vide)',
        });
      }

      // Ajouter les résultats dans les messages
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // stop_reason inattendu (max_tokens, etc.)
    if (response.stop_reason === 'max_tokens') {
      throw new Error("L'agent a atteint la limite de tokens sans terminer. Relancer l'étape.");
    }
    break;
  }

  if (iterations >= MAX_ITER) {
    throw new Error(`Limite d'itérations atteinte (${MAX_ITER}). L'agent n'a pas terminé.`);
  }
}
