import { GoogleGenerativeAI } from "@google/generative-ai";

export const DEFAULT_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

/** La clé API Gemini est-elle configurée ? */
export function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Calcule l'embedding d'un texte via l'API Gemini. */
export async function embedText(
  text: string,
  model: string = DEFAULT_EMBED_MODEL,
): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");

  const genAI = new GoogleGenerativeAI(key);
  const embedModel = genAI.getGenerativeModel({ model });
  const result = await embedModel.embedContent(text);
  return result.embedding.values;
}
