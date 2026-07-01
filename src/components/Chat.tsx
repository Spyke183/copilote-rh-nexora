"use client";

import { useEffect, useRef, useState } from "react";

type Source = {
  docId: string;
  docTitle: string;
  section: string;
  snippet: string;
  score: number;
};

type Tool =
  | { type: "balance"; cpRestants: number; cpAcquis: number; cpPris: number; rttRestants: number }
  | { type: "draft"; draft: string }
  | null;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: "gemini" | "demo";
  tool?: Tool;
};

const SUGGESTIONS = [
  "Combien de jours de congés me reste-t-il ?",
  "Quelles sont les règles du télétravail ?",
  "Comment se faire rembourser un trajet en train ?",
  "Rédige-moi une demande de congés.",
];

let counter = 0;
const nextId = () => `m${counter++}`;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"gemini" | "demo" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function patch(id: string, fields: Partial<Message>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...fields } : m)));
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: question }]);
    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      if (!res.ok || !res.body) throw new Error("Réponse invalide du serveur");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      let metaParsed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });

        if (!metaParsed) {
          const nl = raw.indexOf("\n");
          if (nl === -1) continue;
          try {
            const meta = JSON.parse(raw.slice(0, nl));
            patch(assistantId, { sources: meta.sources, mode: meta.mode, tool: meta.tool });
            setMode(meta.mode);
          } catch {
            /* ignore malformed meta */
          }
          metaParsed = true;
        }

        const nl = raw.indexOf("\n");
        if (nl !== -1) patch(assistantId, { content: raw.slice(nl + 1) });
      }
    } catch {
      patch(assistantId, {
        content: "Désolé, une erreur est survenue. Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="scroll-area min-h-0 flex-1 overflow-y-auto pb-4">
        {isEmpty ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} loading={loading} />
            ))}
          </div>
        )}
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        loading={loading}
        mode={mode}
      />
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
        💬
      </div>
      <h2 className="text-xl font-semibold text-slate-800">Bonjour 👋</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Posez une question sur vos congés, le télétravail, vos notes de frais ou le règlement
        intérieur. Je réponds à partir des documents internes, sources à l&apos;appui.
      </p>
      <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({ message, loading }: { message: Message; loading: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const isStreaming = loading && message.content.length === 0;

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
        N
      </div>
      <div className="min-w-0 flex-1">
        {isStreaming ? (
          <div className="flex items-center gap-1 py-2">
            <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
            <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
            <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {formatMessage(message.content)}
          </div>
        )}

        {message.tool?.type === "balance" && <BalanceCard tool={message.tool} />}
        {message.tool?.type === "draft" && <DraftCard draft={message.tool.draft} />}
        {message.sources && message.sources.length > 0 && (
          <SourceList sources={message.sources} />
        )}
      </div>
    </div>
  );
}

function BalanceCard({
  tool,
}: {
  tool: { cpRestants: number; cpAcquis: number; cpPris: number; rttRestants: number };
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <Stat label="Congés payés restants" value={`${tool.cpRestants} j`} highlight />
      <Stat label="Acquis" value={`${tool.cpAcquis} j`} />
      <Stat label="Déjà posés" value={`${tool.cpPris} j`} />
      <Stat label="RTT restants" value={`${tool.rttRestants} j`} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-[92px]">
      <div className={`text-lg font-semibold ${highlight ? "text-brand-600" : "text-slate-800"}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function DraftCard({ draft }: { draft: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Brouillon prêt à envoyer</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(draft);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{draft}</pre>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        Sources
      </div>
      <div className="space-y-1.5">
        {sources.map((s) => {
          const id = `${s.docId}:${s.section}`;
          const isOpen = open === id;
          return (
            <div key={id} className="rounded-lg border border-slate-200 bg-white">
              <button
                onClick={() => setOpen(isOpen ? null : id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="truncate text-sm text-slate-700">
                  <span className="font-medium">{s.docTitle}</span>
                  <span className="text-slate-400"> — {s.section}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <p className="border-t border-slate-100 px-3 py-2 text-sm text-slate-600">
                  {s.snippet}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  loading,
  mode,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  mode: "gemini" | "demo" | null;
}) {
  return (
    <div className="border-t border-slate-200 pt-3">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-brand-300">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Posez votre question RH…"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <button
          onClick={onSend}
          disabled={loading || !value.trim()}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Envoyer
        </button>
      </div>
      {mode && (
        <div className="mt-1.5 px-1 text-xs text-slate-400">
          {mode === "gemini" ? "Connecté à Gemini" : "Mode démonstration (sans clé API)"}
        </div>
      )}
    </div>
  );
}

function formatMessage(text: string) {
  const parts = text.split(/(\[[^\]\n]+\]|\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\[[^\]]+\]$/.test(part)) {
      return (
        <span
          key={i}
          className="mx-0.5 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
