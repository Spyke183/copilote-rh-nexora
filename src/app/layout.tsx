import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Copilote RH — Nexora",
  description:
    "L'assistant RH interne de Nexora : des réponses fiables à partir des documents de l'entreprise, sources à l'appui.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
