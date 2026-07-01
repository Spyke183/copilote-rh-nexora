import { GoogleGenerativeAI } from "@google/generative-ai";

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

/** La clé API Gemini est-elle configurée ? */
export function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Calcule l'embedding d'un texte via l'API Gemini. */
export async function embedText(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}
