# EG-AGENTS — Chaîne de production de business plans

## Contexte

Projet interne d'Efficience Globale (EG), cabinet de conseil en stratégie basé à Conakry, Guinée. Objectif : une chaîne de douze agents IA spécialisés produisant collectivement des business plans aux standards tier-1 (PwC, BCG, Dalberg, McKinsey), avec ancrage rigoureux dans le contexte guinéen.

Porteur : Malick Soumah, Chief of Staff (tutoiement). Sponsor : Oumar Camara, DG. Appui technique : Manfila Kanté, Lead développeur AI. Validation qualité : consultant senior EG (à désigner).

## Trajectoire validée par le DG

**Phase 1 — POC, 6 semaines, 5 agents uniquement :** Cadrage, Analyste marché, Modèle économique, Modèle financier, Audit final. Les rôles de challenger sont joués MANUELLEMENT (Malick, Manfila, consultant senior). Ne jamais construire d'agents hors périmètre POC sans demande explicite.

**Phase 2 — uniquement si POC validé :** Analyste stratégique, Réglementaire et risques, Rédacteur, et les quatre challengers automatisés.

Cas pilotes : (1) Manden Mining Corporation — usine de remplissage de gaz butane à Kankan (industriel) ; (2) PME/service (à identifier) ; (3) institutionnel/bailleur (à identifier).

## Grille qualité du POC (sur ≥ 3 cas pilotes)

1. Exactitude des hypothèses financières ≥ 90 % validées ou justifiées
2. 100 % des chiffres clés marché sourcés et vérifiables
3. Aucune contradiction majeure entre modèle économique et modèle financier
4. Réduction réelle du temps de production ≥ 40 %
5. Taux de reprise humaine < 30 % du livrable final
6. Acceptabilité consultant senior ≥ 8/10

## Architecture cible (12 agents)

Cadrage → Analyste marché → Challenger marché → Réglementaire et risques → Analyste stratégique → Challenger stratégique → Modèle économique → Modèle financier → Challenger financier → Rédacteur → Challenger rédaction → Audit final.

Contrainte d'architecture : les subagents ne s'appellent pas entre eux. La session principale (pilotée par Malick) orchestre la séquence : elle invoque chaque subagent, vérifie le livrable, puis invoque le suivant.

## Protocole de handoff par fichiers

Chaque agent LIT ses entrées et ÉCRIT ses livrables dans `livrables/<nom-du-cas>/`, selon la numérotation :

- `00-brief/` — brief client brut et annexes
- `01-cadrage/` — questionnaire, fiche projet, résumé exécutif, note d'écarts
- `02-marche/` — étude marché
- `03-modele-economique/` — hypothèses chiffrées
- `04-modele-financier/` — projections et indicateurs
- `05-audit/` — rapport d'audit final

Format markdown pendant le POC. Conversion .docx charte EG uniquement à la livraison finale. Chaque livrable porte un en-tête : agent, version, date, cas pilote, fichiers d'entrée utilisés.

## Taxonomie de qualification (obligatoire dans tous les livrables)

- **[CERTAIN]** : déclaré et vérifiable, ou sourcé
- **[À CONFIRMER]** : déclaré mais à documenter
- **[HYPOTHÈSE]** : posé faute d'information, justifié
- **[RECOMMANDÉ]** : préconisation de l'agent
- **[À ARBITRER]** : choix dépassant le mandat de l'agent

## Standards EG (tous livrables)

- Français par défaut
- Ton sobre, direct, professionnel
- Structure : contexte → enjeu → développement → implications → recommandation
- Fidélité absolue aux sources, aucune invention de chiffre, de nom ou de source
- Proscrire : jargon, marketing, superlatifs, formulations IA, emojis
- Charte graphique (livraison finale .docx) : palette verte #455F51 / #549E39 / #2D5016 / #3D6B4F, police Calibri
- Tutoiement avec collègues EG, vouvoiement vers clients

## Paramètres Guinée (état 2026)

Macro-financier : taux directeur BCRG 9,75 % ; taux débiteur moyen 13,82 % ; inflation projetée 2026 4,4 % ; TVA 18 % ; notation S&P B+ stable ; PIB rebasé 2018 (+51,2 %).

Juridique et fiscal : OHADA (AUSC-GIE révisé 2014, SYSCOHADA) ; Code des investissements (loi mai 2015) — seuils 200 M GNF + 5 emplois, zones A et B ; fiscalité : IS, IMF, TVA 18 %, RTS, versement forfaitaire 6 %, patente, CFU.

Acteurs financiers : banques (Vista Gui, SGBG, Ecobank, Orabank, UBA, BCI, Coris Bank) ; fonds de garantie (FGPE, AGF, ARIZ/EURIZ Proparco, FSA, FAGACE) ; DFI actifs (BAD, IFC, AFD/Proparco, Banque Mondiale, BIDC, Enabel). ATTENTION : la BOAD ne couvre pas la Guinée (zone UEMOA seulement).

Économie réelle : secteur informel 42 % du PIB, 96 % de l'emploi (BAD 2024) ; 1,8 million d'unités de production informelles (INS ENESIG 2018-2019).

## Cadres méthodologiques de référence

Pyramide de Minto, SCQA, SMART, Business Model Canvas, Value Proposition Canvas, Jobs-to-be-Done, PESTEL, 5 forces de Porter, segmentation Kotler, TAM/SAM/SOM (double approche top-down et bottom-up), COSO ERM 2017, standards bancaires de projection 5 ans (P&L / Bilan / Cash-flow articulés), red team thinking et pre-mortem pour les challengers, Performance Standards IFC pour l'ESG.

## Règles de session

1. Une production = un cas pilote = un sous-dossier de `livrables/`.
2. Invoquer les subagents un par un, dans l'ordre de la chaîne. Attendre la validation de Malick (challenger manuel) avant de passer au suivant.
3. Ne jamais inventer de données. En cas d'information manquante, taguer [HYPOTHÈSE] ou [À CONFIRMER] et le signaler explicitement.
4. Versionner : toute modification d'un prompt d'agent incrémente la version dans le frontmatter et est notée dans `JOURNAL.md`.
