import { describe, it, expect } from "vitest";
import { cosineSimilarity, tokenize, keywordScore } from "./similarity";

describe("cosineSimilarity", () => {
  it("vaut 1 pour deux vecteurs identiques", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("vaut 0 pour deux vecteurs orthogonaux", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("retourne 0 quand les dimensions diffèrent", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe("tokenize", () => {
  it("passe en minuscules, retire accents et mots-outils", () => {
    expect(tokenize("Les congés payés")).toEqual(["conges", "payes"]);
  });
});

describe("keywordScore", () => {
  it("donne un meilleur score au passage pertinent", () => {
    const query = "combien de jours de congés";
    const pertinent = keywordScore(query, "Chaque salarié acquiert 25 jours de congés payés.");
    const horsSujet = keywordScore(query, "La charte du télétravail définit les plages horaires.");
    expect(pertinent).toBeGreaterThan(horsSujet);
  });

  it("retourne 0 en l'absence de terme commun", () => {
    expect(keywordScore("congés", "avantages hebdomadaires")).toBe(0);
  });

  it("reconnaît les variantes par préfixe (télétravail ~ télétravailler)", () => {
    expect(keywordScore("télétravail", "Le salarié peut télétravailler trois jours.")).toBeGreaterThan(0);
  });
});
