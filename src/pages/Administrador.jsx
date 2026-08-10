import { Navigate } from "react-router-dom";
import { ShieldCheck, Users } from "lucide-react";
import Usuarios from "@/pages/Usuarios";
import { useAuth } from "@/lib/AuthContext";

export default function Administrador() {
  const { user } = useAuth();
  const role = user?.role || user?.data?.role;

  if (role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight">Administrador</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações administrativas do LicitaAlerta.</p>
      </div>

      <div className="border-b">
        <div className="inline-flex items-center gap-2 border-b-2 border-primary px-3 py-2.5 text-sm font-semibold text-primary">
          <Users className="w-4 h-4" />
          Usuários
        </div>
      </div>

      <Usuarios embedded />
    </div>
  );
}