import Chat from "@/components/Chat";

export default function Home() {
  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-semibold text-white">
          N
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight text-slate-900">Copilote RH</h1>
          <p className="text-sm text-slate-500">Nexora · assistant interne</p>
        </div>
      </header>

      <Chat />

      <footer className="py-3 text-center text-xs text-slate-400">
        Réponses fondées sur les documents internes de Nexora. En cas de doute, contactez le
        service RH.
      </footer>
    </div>
  );
}
