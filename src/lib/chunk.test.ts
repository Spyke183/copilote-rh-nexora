import { describe, it, expect } from "vitest";
import { splitSections, windowize, chunkDocument } from "./chunk";

describe("splitSections", () => {
  it("sépare le document selon ses titres", () => {
    const md = "# Titre\nIntro\n## A\nTexte A\n## B\nTexte B";
    const sections = splitSections(md);
    expect(sections.map((s) => s.section)).toEqual(["Titre", "A", "B"]);
  });

  it("rattache le texte précédant tout titre à 'Présentation'", () => {
    const sections = splitSections("un paragraphe\n## Section\ncontenu");
    expect(sections[0].section).toBe("Présentation");
  });
});

describe("windowize", () => {
  it("retourne un seul morceau pour un texte court", () => {
    expect(windowize("texte court")).toEqual(["texte court"]);
  });

  it("découpe un long texte en plusieurs morceaux bornés", () => {
    const long = "Une phrase de test. ".repeat(200);
    const parts = windowize(long, 900, 150);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(900);
  });

  it("ignore un texte vide", () => {
    expect(windowize("   \n  ")).toEqual([]);
  });
});

describe("chunkDocument", () => {
  it("produit des passages identifiés et rattachés au document", () => {
    const meta = { id: "doc", title: "Doc", category: "Test" };
    const chunks = chunkDocument(meta, "# Doc\n## Section\ncontenu utile");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].id).toBe("doc#0");
    expect(chunks[0].docTitle).toBe("Doc");
    expect(chunks[0].section).toBe("Section");
  });
});
