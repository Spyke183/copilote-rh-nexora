export type DocMeta = {
  /** Identifiant court du document, ex: "conges" */
  id: string;
  /** Titre lisible, ex: "Politique de congés et RTT" */
  title: string;
  /** Catégorie RH, ex: "Congés" */
  category: string;
};

export type Chunk = {
  /** Identifiant unique du passage, ex: "conges#3" */
  id: string;
  docId: string;
  docTitle: string;
  /** Titre de la section d'origine dans le document */
  section: string;
  text: string;
  /** Vecteur d'embedding (absent en mode démo sans clé API) */
  embedding?: number[];
};

export type SearchIndex = {
  /** Modèle d'embedding utilisé, null si aucun (mode démo) */
  model: string | null;
  createdAt: string;
  chunks: Chunk[];
};

export type Source = {
  docId: string;
  docTitle: string;
  section: string;
  snippet: string;
  score: number;
};
