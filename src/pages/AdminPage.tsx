import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../libs/supabaseClient"; // 👈 asegúrate que es /lib/ no /libs/
import { useAuth } from "../context/AuthContext";
import Squares from "../components/Squares";
import Shuffle from "../components/Shuffle";
import { TbQrcode, TbPlus, TbPlayerPlay, TbLogout } from "react-icons/tb";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Panel Admin";
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="relative min-h-screen text-white">
      {/* Fondo animado: ocupa toda la pantalla */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* Puedes ajustar dirección, tamaño, velocidad y colores */}
        <Squares
          direction="diagonal"
          speed={0.4}
          borderColor="#ffffffff"
          squareSize={48}
          hoverFillColor="#0b0b16"
        />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          {/* Título con Shuffle */}
          <div>
            <Shuffle
              text="Panel Admin"
              className="text-4xl md:text-6xl font-extrabold leading-tight"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={false}
              respectReducedMotion={true}
            />
            <p className="text-white/70 text-sm mt-2">
              Sesión: <span className="font-semibold">{user?.email}</span>
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 border border-white/10 transition-colors"
            title="Cerrar sesión"
          >
            <TbLogout size={18} />
            Cerrar sesión
          </button>
        </header>

        {/* Acciones principales */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard
            icon={<TbPlus size={28} />}
            title="Crear evento"
            description="Configura nombre, fecha y opciones."
            onClick={() => navigate("/admin/events/new")}
          />

          <ActionCard
            icon={<TbQrcode size={28} />}
            title="Generar QR"
            description="Comparte el código para que se unan."
            onClick={() => navigate("/admin/qr")}
          />

          <ActionCard
            icon={<TbPlayerPlay size={28} />}
            title="Control en vivo"
            description="Lanza colores, parpadeos y efectos."
            onClick={() => navigate("/admin/live")}
          />
        </section>

        {/* Contenedor inferior (ejemplo) */}
        <section className="mt-8 rounded-2xl bg-white/5 p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-2">Resumen</h2>
          <ul className="list-disc list-inside text-white/80 space-y-1 text-sm">
            <li>0 eventos activos</li>
            <li>0 usuarios conectados</li>
            <li>Última acción: —</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Tarjeta de acción reutilizable */
function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2">{icon}</div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <span className="opacity-0 group-hover:opacity-100 text-white/60 text-sm transition-opacity">
          Abrir →
        </span>
      </div>
      <p className="text-white/70 text-sm mt-2">{description}</p>
    </button>
  );
}
