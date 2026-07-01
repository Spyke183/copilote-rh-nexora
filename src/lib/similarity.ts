/** Similarité cosinus entre deux vecteurs de même dimension. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "au", "aux", "en",
  "que", "qui", "quoi", "est", "sur", "pour", "dans", "par", "je", "tu", "il",
  "elle", "on", "nous", "vous", "ils", "mon", "ma", "mes", "ce", "cet", "cette",
  "se", "sa", "son", "ses", "comment", "combien", "quel", "quelle", "quels",
  "quelles", "puis", "peut", "dois", "fait", "avec", "pas", "plus", "ou",
  "si", "mais", "donc", "car", "ne", "the",
]);

/** Normalise et découpe un texte en mots utiles (sans accents ni mots-outils). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Score de recouvrement de mots-clés (fallback sans embeddings).
 * Récompense les passages contenant les termes de la question.
 */
export function keywordScore(query: string, text: string): number {
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0) return 0;

  const docTokens = tokenize(text);
  if (docTokens.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const token of docTokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  const uniqueDocTokens = [...counts.keys()];

  let score = 0;
  for (const term of queryTerms) {
    const exact = counts.get(term) ?? 0;
    if (exact > 0) {
      score += 1 + Math.log(exact);
      continue;
    }
    // Correspondance par préfixe : "télétravail" ~ "télétravailler", "congé" ~ "congés".
    let partial = 0;
    for (const docToken of uniqueDocTokens) {
      if (
        term.length >= 5 &&
        docToken.length >= 5 &&
        (docToken.startsWith(term) || term.startsWith(docToken))
      ) {
        partial = 0.7;
        break;
      }
    }
    score += partial;
  }
  return score / Math.sqrt(docTokens.length);
}
