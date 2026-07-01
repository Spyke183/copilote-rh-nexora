import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Source } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export const SYSTEM_PROMPT = `Tu es le copilote RH interne de l'entreprise Nexora.
Tu réponds aux questions des salariés UNIQUEMENT à partir des extraits de documents internes fournis.

Règles :
- Réponds en français, de façon claire, concrète et concise.
- Cite systématiquement le document et la section utilisés entre crochets, par exemple : [Charte du télétravail — Éligibilité].
- Si l'information ne figure pas dans les extraits fournis, dis-le franchement et invite la personne à contacter le service RH. N'invente jamais une règle ou un chiffre.
- Adopte un ton professionnel et bienveillant d'assistant RH. Ne parle pas de « extraits » ou de « documents fournis » de façon technique, et ne mentionne pas que tu es une intelligence artificielle.`;

export function buildContext(sources: Source[]): string {
  if (sources.length === 0) return "(aucun passage pertinent trouvé dans les documents internes)";
  return sources
    .map((s, i) => `[Source ${i + 1}] ${s.docTitle} — ${s.section}\n${s.snippet}`)
    .join("\n\n");
}

export function buildUserPrompt(query: string, sources: Source[], toolNote?: string): string {
  return [
    toolNote ? `Donnée interne calculée pour ce salarié : ${toolNote}` : "",
    `Documents internes disponibles :`,
    buildContext(sources),
    ``,
    `Question du salarié : ${query}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Génère la réponse en flux (streaming) via Gemini. */
export async function* streamAnswer(
  query: string,
  sources: Source[],
  toolNote?: string,
): AsyncGenerator<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_PROMPT });
  const result = await model.generateContentStream(buildUserPrompt(query, sources, toolNote));

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export type ToolResult =
  | { type: "balance"; cpRestants: number; cpAcquis: number; cpPris: number; rttRestants: number }
  | { type: "draft"; draft: string }
  | null;

/**
 * Réponse de repli sans clé API (mode démo) : elle s'appuie sur le meilleur
 * passage trouvé et sur les données calculées, en restant transparente.
 */
export function fallbackAnswer(
  query: string,
  sources: Source[],
  toolNote?: string,
  tool?: ToolResult,
): string {
  const lines: string[] = [];

  if (toolNote) lines.push(toolNote);
  if (tool?.type === "draft") lines.push("", tool.draft);

  if (sources.length === 0) {
    lines.push(
      "Je n'ai pas trouvé cette information dans les documents internes. Je vous invite à contacter le service RH pour en savoir plus.",
    );
  } else {
    const top = sources[0];
    lines.push(
      `D'après « ${top.docTitle} » (${top.section}) :`,
      "",
      top.snippet.trim(),
      "",
      `Source : [${top.docTitle} — ${top.section}]`,
    );
  }

  lines.push(
    "",
    "— Mode démonstration (sans clé API) : cette réponse s'appuie sur la recherche par mots-clés. Ajoutez une clé Gemini pour des réponses entièrement rédigées.",
  );
  return lines.join("\n");
}
