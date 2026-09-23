# EG-AGENTS — Chaîne de production de business plans

Système de production automatisée de business plans aux standards tier-1 (PwC, BCG, Dalberg), développé par **Efficience Globale** (Conakry, Guinée).

---

## Architecture

```
eg-agents/
├── frontend/
│   ├── server.js          # Point d'entrée Express
│   ├── lib/
│   │   ├── constants.js   # Chemins, CHAIN_ORDER, prompts, fonctions partagées
│   │   ├── cma.js         # Exécution des sessions Claude Managed Agents (CMA)
│   │   └── verifier.js    # Couche de vérification automatique post-agent
│   ├── routes/
│   │   ├── cases.js       # CRUD des cas pilotes + statut
│   │   ├── pipeline.js    # Déclenchement agents + vérification (SSE)
│   │   ├── chat.js        # Questionnaire conversationnel (mode sans brief)
│   │   └── files.js       # Upload brief, génération et téléchargement Word
│   ├── public/            # Interface web (HTML/CSS/JS vanilla)
│   ├── setup-cma.js       # Script d'initialisation des agents CMA (à exécuter une fois)
│   └── package.json
├── .claude/agents/        # Prompts système des agents (fichiers .md)
├── livrables/             # Sorties des agents, par cas pilote (non versionné)
├── .env.example           # Modèle de configuration
├── .gitignore
└── CLAUDE.md              # Instructions de session pour Claude
```

### Chaîne d'agents (POC — Phase 1)

| Étape | Agent | Modèle | Sortie |
|-------|-------|--------|--------|
| cadrage-t1 | Cadrage Temps 1 | Sonnet | questionnaire-v1.md |
| cadrage-t2 | Cadrage Temps 2 | Sonnet | fiche-projet-v1.md, resume-executif-v1.md, note-ecarts-v1.md |
| analyste-marche | Analyste marché | Sonnet + web | etude-marche-v1.md |
| modele-economique | Modèle économique | Sonnet + bash | modele-economique-v1.md |
| modele-financier | Modèle financier | Sonnet + bash | modele-financier-v1.md |
| audit-final | Audit final | Opus | rapport-audit-v1.md |
| redacteur | Rédacteur | Sonnet | business-plan-synthese-v1.md |

### Vérification automatique

Après chaque agent, un appel Haiku (non-streaming, ~3 s) évalue le livrable produit selon des critères spécifiques à l'étape. Résultat : `PASS` / `WARN` / `FAIL`. Un `FAIL` bloque la chaîne.

---

## Installation

### Première installation (admin du projet)

```bash
# 1. Cloner le dépôt
git clone <url-du-repo>
cd eg-agents

# 2. Configurer l'environnement
cp .env.example frontend/.env
# Renseigner ANTHROPIC_API_KEY dans frontend/.env

# 3. Installer les dépendances
cd frontend && npm install

# 4. Créer les agents CMA (une seule fois par workspace Anthropic)
node setup-cma.js
# → Écrit CMA_ENV_ID et CMA_AGENT_* dans frontend/.env

# 5. Démarrer le serveur
npm start
# → http://localhost:3131
```

> **Clé API** : générer sur [platform.anthropic.com](https://platform.anthropic.com). Ne jamais committer `frontend/.env`.

---

### Rejoindre un projet existant (collaborateur)

Les agents CMA sont partagés au niveau du workspace Anthropic : pas besoin de les recréer.

**Étape 1 — Obtenir le fichier `.env` de l'administrateur**

L'administrateur génère une clé API dédiée sur [platform.anthropic.com → API Keys](https://platform.anthropic.com) et transmet hors-GitHub (e-mail chiffré, partage sécurisé) un fichier `frontend/.env` contenant :

```
ANTHROPIC_API_KEY=sk-ant-...   ← clé dédiée au collaborateur
CMA_ENV_ID=env_...             ← même valeur que l'admin
CMA_AGENT_CADRAGE_T1=agent_... ← mêmes valeurs que l'admin
CMA_AGENT_CADRAGE_T2=agent_...
CMA_AGENT_ANALYSTE_MARCHE=agent_...
CMA_AGENT_MODELE_ECONOMIQUE=agent_...
CMA_AGENT_MODELE_FINANCIER=agent_...
CMA_AGENT_AUDIT_FINAL=agent_...
CMA_AGENT_REDACTEUR=agent_...
```

**Étape 2 — Installer et démarrer**

```bash
git clone <url-du-repo>
cd eg-agents/frontend
# Placer le fichier .env reçu dans ce dossier
npm install
npm start
# → http://localhost:3131
```

> `setup-cma.js` **ne doit pas être relancé** — il créerait des agents dupliqués.

---

## Utilisation

1. Accéder à `http://localhost:3131`
2. Créer un nouveau cas pilote (upload d'un brief ou mode questionnaire)
3. Lancer les agents dans l'ordre via l'interface
4. Chaque agent produit ses livrables dans `livrables/<cas>/`
5. Un badge PASS/WARN/FAIL s'affiche après chaque étape
6. Télécharger le business plan final (.docx) une fois le rédacteur terminé

---

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète.

| Variable | Requis | Description |
|----------|--------|-------------|
| `ANTHROPIC_API_KEY` | Oui | Clé API Anthropic |
| `CMA_ENV_ID` | Oui | ID environnement CMA (généré par setup-cma.js) |
| `CMA_AGENT_*` | Oui | IDs des 7 agents CMA (générés par setup-cma.js) |
| `PPLX_API_KEY` | Non | Clé Perplexity pour la recherche web (analyste marché) |
| `PORT` | Non | Port du serveur (défaut : 3131) |

---

## Cas pilotes

- **manden-mining** : Manden Mining Corporation — usine de remplissage de gaz butane à Kankan (industriel)
- *(2 cas PME/service et institutionnel/bailleur à venir en Phase 1)*

---

## Confidentialité

Les livrables (dossier `livrables/`) contiennent des données client confidentielles et ne sont pas versionnés (voir `.gitignore`). Ne pas exposer le serveur sans authentification sur un réseau public.
