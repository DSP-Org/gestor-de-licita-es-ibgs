import { Clock3, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AcessoPendente({ rejeitado = false }) {
  const sair = () => base44.auth.logout("/login");

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Clock3 className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-xl font-bold">
          {rejeitado ? "Acesso não autorizado" : "Cadastro aguardando aprovação"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {rejeitado
            ? "Seu acesso não foi liberado. Entre em contato com o administrador."
            : "Sua conta foi criada com sucesso. Um administrador precisa liberar seu acesso ao sistema."}
        </p>
        <button onClick={sair} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </section>
    </main>
  );
}