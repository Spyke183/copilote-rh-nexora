import indexData from "@/data/index.json";
import type { Chunk, SearchIndex, Source } from "./types";
import { cosineSimilarity, keywordScore } from "./similarity";
import { embedText } from "./embeddings";

const index = indexData as unknown as SearchIndex;

/** L'index contient-il des embeddings exploitables ? */
export function hasEmbeddings(): boolean {
  return (
    Boolean(index.model) &&
    index.chunks.length > 0 &&
    Array.isArray(index.chunks[0]?.embedding)
  );
}

/** Mode de recherche effectivement utilisé au runtime. */
export function retrievalMode(): "semantic" | "keyword" {
  return hasEmbeddings() && process.env.GEMINI_API_KEY ? "semantic" : "keyword";
}

const PREVIEW_LENGTH = 260;

function toSource(chunk: Chunk, score: number): Source {
  const snippet =
    chunk.text.length > PREVIEW_LENGTH
      ? chunk.text.slice(0, PREVIEW_LENGTH).trimEnd() + "…"
      : chunk.text;
  return {
    docId: chunk.docId,
    docTitle: chunk.docTitle,
    section: chunk.section,
    snippet,
    score: Number(score.toFixed(4)),
  };
}

/**
 * Recherche les passages les plus pertinents pour une question.
 * Utilise les embeddings si disponibles, sinon un score de mots-clés.
 */
export async function retrieve(query: string, k = 4): Promise<Source[]> {
  const scored: { chunk: Chunk; score: number }[] = [];

  if (hasEmbeddings() && process.env.GEMINI_API_KEY) {
    // On embarque la requête avec le MÊME modèle que celui de l'index.
    const queryEmbedding = await embedText(query, index.model || undefined);
    for (const chunk of index.chunks) {
      if (!chunk.embedding) continue;
      scored.push({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) });
    }
  } else {
    for (const chunk of index.chunks) {
      // Le titre de section est un signal fort : on le pondère davantage.
      const score = keywordScore(query, chunk.text) + 1.5 * keywordScore(query, chunk.section);
      scored.push({ chunk, score });
    }
  }

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => toSource(s.chunk, s.score));
}
