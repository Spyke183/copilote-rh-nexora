# Copilote RH — Nexora

Assistant RH interne qui répond aux questions des salariés **à partir des documents de
l'entreprise** (congés, télétravail, notes de frais, règlement intérieur, avantages), en
**citant systématiquement ses sources**. Quand l'information ne figure pas dans les documents,
il le dit plutôt que d'inventer.

Réalisé dans le cadre du Hackathon IA (Ynov) — « Construire un copilote IA métier ».

## Fonctionnalités

- **Réponses fondées sur les documents internes** (RAG) avec citation du document et de la section.
- **Garde-fou anti-hallucination** : « je ne sais pas » lorsque la réponse n'est pas dans la base.
- **Outils métier** : calcul du solde de congés et génération d'un brouillon de demande.
- **Interface de chat** avec réponses en streaming, sources dépliables et questions suggérées.
- **Mode démonstration** : l'application fonctionne même sans clé API (recherche par mots-clés).

## Stack technique

| Couche | Choix |
|---|---|
| Front & back | Next.js (App Router) · TypeScript · Tailwind CSS |
| IA | Google Gemini (génération + embeddings `text-embedding-004`) |
| Recherche | Index vectoriel local (aucune base de données à héberger) |
| Tests | Vitest |
| Hébergement | Vercel |

## Démarrage rapide

```bash
npm install

# 1. (optionnel) activer les réponses rédigées par l'IA
cp .env.local.example .env.local
# puis renseigner GEMINI_API_KEY (clé gratuite : https://aistudio.google.com/apikey)

# 2. construire l'index des documents
npm run index

# 3. lancer l'application
npm run dev
```

L'application est disponible sur http://localhost:3000.

Sans `GEMINI_API_KEY`, l'application démarre en **mode démonstration** : la recherche se fait
par mots-clés et la réponse s'appuie sur les extraits trouvés. Avec une clé, la recherche
devient sémantique et les réponses sont rédigées par Gemini.

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `GEMINI_API_KEY` | Clé API Google Gemini | — (mode démo si absente) |
| `GEMINI_MODEL` | Modèle de génération | `gemini-2.0-flash` |
| `GEMINI_EMBED_MODEL` | Modèle d'embeddings | `text-embedding-004` |

## Structure

```
src/
  app/
    page.tsx            Page principale
    layout.tsx          Mise en page
    api/chat/route.ts   Endpoint de chat (streaming)
  components/
    Chat.tsx            Interface de conversation
  lib/
    chunk.ts            Découpage des documents
    similarity.ts       Cosinus + score de mots-clés
    embeddings.ts       Embeddings Gemini
    retrieve.ts         Recherche des passages pertinents
    generate.ts         Construction du prompt + génération
    leave.ts            Solde de congés & brouillon de demande
  data/
    documents/          Base documentaire (markdown)
    index.json          Index généré (npm run index)
scripts/
  build-index.ts        Construction de l'index
```

## Tests

```bash
npm test
```

Les tests couvrent le découpage des documents, les mesures de similarité et la logique métier
des congés.

## Déploiement

Le projet se déploie sur Vercel sans configuration supplémentaire. La commande de build
(`npm run build`) reconstruit automatiquement l'index avant de compiler l'application. Pour
activer la recherche sémantique et les réponses rédigées, ajouter `GEMINI_API_KEY` dans les
variables d'environnement du projet Vercel.

## Équipe

Ugo Ameslant · Thomas Barrault · Torea Tinorua · Kylian Broccolichi
