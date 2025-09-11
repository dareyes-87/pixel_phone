import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PrismaticBurst from "../components/PrismaticBurst";
import Shuffle from "../components/Shuffle";
import PixelCard from "../components/PixelCard";
import { IoMdGlobe } from "react-icons/io";
import { TbCheckupList } from "react-icons/tb";

/** Modal básico accesible */
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Cerrar con ESC
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // Bloquear scroll del body cuando esté abierto
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white text-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {title && (
            <h3 id="modal-title" className="text-xl font-semibold mb-4">
              {title}
            </h3>
          )}
          {children}
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [openAdmin, setOpenAdmin] = useState(false);
  const [openPixel, setOpenPixel] = useState(false);
  const navigate = useNavigate();

  const handleAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");

    // TODO: Integra tu login real (Supabase, etc.)
    // Ejemplo (ajusta la importación según tu proyecto):
    // const { error } = await supabase.auth.signInWithPassword({ email, password });
    // if (error) { /* muestra error */ return; }

    // De momento, navega al panel admin tras "iniciar sesión"
    navigate("/admin");
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {/* Fondo animado */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <PrismaticBurst
          animationType="rotate3d"
          intensity={4}
          speed={0.5}
          distort={1.0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={24}
          mixBlendMode="normal"
          colors={["#ff007a", "#4d3dff", "#ffffff"]}
        />
      </div>

      {/* Contenido */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#fff",
          textAlign: "center",
          padding: "3rem 1rem",
        }}
      >
        <div className="flex flex-col items-center gap-8">
          <Shuffle
            text="Pixel Phone"
            className="pixel-title"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            respectReducedMotion={true}
          />

          {/* Dos “botones” */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* ADMIN: abre modal de login */}
            <button
              type="button"
              onClick={() => setOpenAdmin(true)}
              className="no-underline inline-block text-left focus:outline-none"
              aria-label="Entrar como administrador"
            >
              <PixelCard variant="blue">
                <div className="flex flex-col items-center gap-3">
                  <IoMdGlobe size={48} />
                  <h2 className="text-3xl font-extrabold">Administrador</h2>
                  <p className="text-sm text-white/80 max-w-[220px]">
                    Crea y controla eventos, colores y efectos.
                  </p>
                </div>
              </PixelCard>
            </button>

            {/* PIXEL USER: abre modal con botón para escanear */}
            <button
              type="button"
              onClick={() => setOpenPixel(true)}
              className="no-underline inline-block text-left focus:outline-none"
              aria-label="Unirse como Pixel User"
            >
              <PixelCard variant="pink">
                <div className="flex flex-col items-center gap-3">
                  <TbCheckupList size={48} />
                  <h2 className="text-3xl font-extrabold">Pixel User</h2>
                  <p className="text-sm text-white/80 max-w-[220px]">
                    Únete con un código QR y sé un “pixel”.
                  </p>
                </div>
              </PixelCard>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Login Admin */}
      <Modal open={openAdmin} onClose={() => setOpenAdmin(false)} title="Iniciar sesión (Administrador)">
        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="admin@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Iniciar sesión
          </button>

          <p className="text-xs text-gray-500 text-center">
            ¿No tienes cuenta?{" "}
            <Link to="/signup" className="underline text-indigo-600 hover:text-indigo-700">
              Crear cuenta
            </Link>
          </p>
        </form>
      </Modal>

      {/* MODAL: Pixel User */}
      <Modal open={openPixel} onClose={() => setOpenPixel(false)} title="Unirse como Pixel User">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Para unirte a un evento, el administrador te mostrará un código QR.
            Presiona el botón para abrir el lector y unirte al evento.
          </p>

          <button
            type="button"
            onClick={() => navigate("/join")}
            className="w-full rounded-xl bg-pink-600 px-4 py-2 font-semibold text-white hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            Escanear Código QR del evento
          </button>

          <p className="text-xs text-gray-500 text-center">
            ¿Tienes un enlace de invitación?{" "}
            <Link to="/join" className="underline text-pink-600 hover:text-pink-700">
              Abrir unirme por enlace
            </Link>
          </p>
        </div>
      </Modal>
    </div>
  );
}
