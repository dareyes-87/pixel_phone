// src/pages/AdminPage.tsx
import { supabase } from "../libs/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <button
            onClick={handleSignOut}
            className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </header>

        <div className="space-y-4">
          <p className="text-white/80 text-sm">
            Sesión iniciada como:{" "}
            <span className="font-semibold">{user?.email}</span>
          </p>
          {/* Aquí irán tus herramientas de administración: crear evento, controlar efectos, etc. */}
          <div className="rounded-2xl bg-white/5 p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-2">Acciones</h2>
            <ul className="list-disc list-inside text-white/80">
              <li>Crear evento</li>
              <li>Generar QR</li>
              <li>Controlar efectos en tiempo real</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
