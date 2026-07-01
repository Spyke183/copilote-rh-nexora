import { retrieve } from "@/lib/retrieve";
import { streamAnswer, fallbackAnswer, type ToolResult } from "@/lib/generate";
import {
  DEMO_EMPLOYEE,
  detectLeaveIntent,
  draftLeaveRequest,
  leaveBalance,
} from "@/lib/leave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let message = "";
  try {
    const body = await req.json();
    message = typeof body?.message === "string" ? body.message.trim() : "";
  } catch {
    return new Response("Requête invalide", { status: 400 });
  }
  if (!message) return new Response("Le message est requis", { status: 400 });

  const sources = await retrieve(message, 4);

  // Outils "métier" : solde de congés et brouillon de demande.
  const intent = detectLeaveIntent(message);
  let toolNote: string | undefined;
  let tool: ToolResult = null;
  if (intent === "balance") {
    const b = leaveBalance();
    toolNote = `${DEMO_EMPLOYEE.name} dispose de ${b.cpRestants} jours de congés payés (sur ${b.cpAcquis} acquis, ${b.cpPris} déjà posés) et de ${b.rttRestants} RTT restants.`;
    tool = { type: "balance", cpRestants: b.cpRestants, cpAcquis: b.cpAcquis, cpPris: b.cpPris, rttRestants: b.rttRestants };
  } else if (intent === "draft") {
    const draft = draftLeaveRequest();
    toolNote = "Un brouillon de demande de congés a été préparé pour ce salarié.";
    tool = { type: "draft", draft };
  }

  const mode: "gemini" | "demo" = process.env.GEMINI_API_KEY ? "gemini" : "demo";
  const meta = JSON.stringify({ sources, mode, tool });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 1ère ligne : métadonnées (sources, mode, outil) — puis le texte streamé.
      controller.enqueue(encoder.encode(meta + "\n"));
      try {
        if (mode === "gemini") {
          for await (const piece of streamAnswer(message, sources, toolNote)) {
            controller.enqueue(encoder.encode(piece));
          }
        } else {
          controller.enqueue(encoder.encode(fallbackAnswer(message, sources, toolNote, tool)));
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            "\n\nDésolé, une erreur est survenue pendant la génération de la réponse. Merci de réessayer.",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
