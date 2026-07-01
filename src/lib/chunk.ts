import type { Chunk, DocMeta } from "./types";

const MAX_CHARS = 900;
const OVERLAP = 150;

/**
 * Découpe un document markdown en sections à partir de ses titres (# ## ###).
 * Le texte avant le premier titre est rattaché à une section "Présentation".
 */
export function splitSections(markdown: string): { section: string; body: string }[] {
  const lines = markdown.split(/\r?\n/);
  const sections: { section: string; body: string }[] = [];
  let current = { section: "Présentation", body: "" };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      if (current.body.trim()) sections.push(current);
      current = { section: heading[1].trim(), body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.body.trim()) sections.push(current);
  return sections;
}

/**
 * Découpe un texte long en fenêtres qui se chevauchent, en coupant de
 * préférence sur une fin de paragraphe ou de phrase pour rester lisible.
 */
export function windowize(text: string, maxChars = MAX_CHARS, overlap = OVERLAP): string[] {
  const clean = text.replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length === 0) return [];
  if (clean.length <= maxChars) return [clean];

  const out: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const boundary = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
      if (boundary > maxChars * 0.5) end = start + boundary + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) out.push(piece);
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return out;
}

/** Transforme un document en une liste de passages indexables. */
export function chunkDocument(meta: DocMeta, markdown: string): Chunk[] {
  const chunks: Chunk[] = [];
  let n = 0;
  for (const { section, body } of splitSections(markdown)) {
    for (const text of windowize(body)) {
      chunks.push({
        id: `${meta.id}#${n++}`,
        docId: meta.id,
        docTitle: meta.title,
        section,
        text,
      });
    }
  }
  return chunks;
}
