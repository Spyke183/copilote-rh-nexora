/**
 * Construit l'index de recherche à partir des documents markdown.
 *
 *  - Sans clé API : écrit un index "mots-clés" (chunks sans embeddings).
 *  - Avec clé API : calcule les embeddings Gemini pour la recherche sémantique.
 *
 * Lancé par `npm run index` et automatiquement avant `next build`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chunkDocument } from "../src/lib/chunk";
import type { Chunk, DocMeta, SearchIndex } from "../src/lib/types";

loadEnvLocal();

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "src", "data", "documents");
const OUT = join(ROOT, "src", "data", "index.json");
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const KEY = process.env.GEMINI_API_KEY;

const MANIFEST: Record<string, DocMeta> = {
  "conges.md": { id: "conges", title: "Politique de congés et RTT", category: "Congés" },
  "teletravail.md": { id: "teletravail", title: "Charte du télétravail", category: "Télétravail" },
  "notes-de-frais.md": { id: "notes-de-frais", title: "Politique de notes de frais", category: "Frais" },
  "reglement-interieur.md": { id: "reglement-interieur", title: "Règlement intérieur", category: "Règlement" },
  "avantages.md": { id: "avantages", title: "Avantages sociaux", category: "Avantages" },
};

async function main() {
  const chunks: Chunk[] = [];
  for (const [file, meta] of Object.entries(MANIFEST)) {
    const path = join(DOCS_DIR, file);
    if (!existsSync(path)) {
      console.warn(`Document introuvable, ignoré : ${file}`);
      continue;
    }
    chunks.push(...chunkDocument(meta, readFileSync(path, "utf-8")));
  }
  console.log(`${chunks.length} passages extraits de ${Object.keys(MANIFEST).length} documents.`);

  if (!KEY) {
    if (existsSync(OUT)) {
      const existing = JSON.parse(readFileSync(OUT, "utf-8")) as SearchIndex;
      if (existing.model && existing.chunks?.[0]?.embedding) {
        console.log("Clé API absente : index existant avec embeddings conservé.");
        return;
      }
    }
    write({ model: null, createdAt: new Date().toISOString(), chunks });
    console.log(
      "Index écrit SANS embeddings (mode démo). Renseignez GEMINI_API_KEY puis relancez pour activer la recherche sémantique.",
    );
    return;
  }

  // On tente plusieurs modèles : un nom retiré (ex. text-embedding-004) ne doit
  // jamais faire échouer le build — au pire l'index reste en mode mots-clés.
  const candidates = [...new Set([EMBED_MODEL, "gemini-embedding-001", "text-embedding-004"])];
  const genAI = new GoogleGenerativeAI(KEY);
  let usedModel: string | null = null;

  for (const name of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      console.log(`Calcul des embeddings via ${name}…`);
      for (let i = 0; i < chunks.length; i++) {
        const res = await model.embedContent(chunks[i].text);
        chunks[i].embedding = res.embedding.values;
        process.stdout.write(`\r  ${i + 1}/${chunks.length} passages`);
      }
      process.stdout.write("\n");
      usedModel = name;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 140) : String(err);
      console.warn(`\nModèle d'embedding « ${name} » indisponible (${msg}). Essai suivant…`);
      for (const c of chunks) delete c.embedding;
    }
  }

  if (usedModel) {
    write({ model: usedModel, createdAt: new Date().toISOString(), chunks });
    console.log(`Index écrit AVEC embeddings via ${usedModel} (recherche sémantique active).`);
  } else {
    write({ model: null, createdAt: new Date().toISOString(), chunks });
    console.warn(
      "Aucun modèle d'embedding disponible : index écrit en mode mots-clés. La génération IA reste active au runtime.",
    );
  }
}

function write(index: SearchIndex) {
  writeFileSync(OUT, JSON.stringify(index));
}

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
