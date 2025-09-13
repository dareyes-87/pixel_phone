// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
// Lazy: estos componentes suelen animar/dibujar
const PrismaticBurst = lazy(() => import("../components/PrismaticBurst"));
const Shuffle = lazy(() => import("../components/Shuffle"));

import PixelCard from "../components/PixelCard";
import { IoMdGlobe } from "react-icons/io";
import { TbCheckupList } from "react-icons/tb";
import { supabase } from "../libs/supabaseClient";

/** Heurística ligera para decidir el modo de rendimiento */
function usePerfMode() {
  const [mode, setMode] = useState<"full" | "reduced" | "static">("full");

  useEffect(() => {
    try {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Estos valores no existen en todos los navegadores (están bien como heurística)
      const deviceMemory = (navigator as any).deviceMemory ?? 8; // GB aprox
      const cores = navigator.hardwareConcurrency ?? 8;
      const isSmallScreen = window.innerWidth < 640;
      const ua = navigator.userAgent || "";
      const isIOS = /iPhone|iPad|iPod/i.test(ua);

      // Reglas:
      // - Si el usuario pide menos movimiento -> modo "static"
      // - Si el dispositivo es muy limitado -> "static"
      // - Si es modesto o pantalla pequeña -> "reduced"
      // - Si es bueno -> "full"
      let decided: "full" | "reduced" | "static" = "full";

      if (prefersReduced) decided = "static";
      else if (deviceMemory <= 2 || cores <= 2) decided = "static";
      else if (deviceMemory <= 3 || cores <= 4 || isSmallScreen || isIOS) decided = "reduced";
      else decided = "full";

      setMode(decided);
      // Exponer como atributo para inspección/depuración en CSS si quieres
      document.documentElement.setAttribute("data-perf-mode", decided);
    } catch {
      setMode("reduced");
    }
  }, []);

  return mode;
}

/** Modal básico accesible */
function Modal({
  open,
  onClose,
  title,
  children,
  perfMode = "full",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  perfMode?: "full" | "reduced" | "static";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const supportsBackdrop =
    typeof CSS !== "undefined" && CSS.supports && CSS.supports("backdrop-filter: blur(4px)");

  const useBlur = perfMode === "full" && supportsBackdrop;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      {/* Evita backdrop-blur en reduced/static */}
      <div
        className={
          useBlur
            ? "absolute inset-0 bg-black/40 backdrop-blur-sm"
            : "absolute inset-0 bg-black/65"
        }
      />
      <div
        className="relative w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white text-gray-900 shadow-xl"
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
  const perfMode = usePerfMode();
  const [openAdmin, setOpenAdmin] = useState(false);
  const [openPixel, setOpenPixel] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const fullName = String(data.get("name") || "").trim();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setOpenAdmin(false);
        navigate("/admin");
      } else {
        const { data: signData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        if (signData.session) {
          setOpenAdmin(false);
          navigate("/admin");
        } else {
          setInfoMsg(
            "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada."
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  // Parámetros del fondo según rendimiento
  const bgProps = useMemo(() => {
    if (perfMode === "static") {
      return { use: "static" as const };
    }
    if (perfMode === "reduced") {
      return {
        use: "animated" as const,
        rayCount: 8,
        speed: 0.18,
        intensity: 2.2,
        distort: 0.4,
        colors: ["#7c3aed", "#ec4899", "#ffffff"],
      };
    }
    // full
    return {
      use: "animated" as const,
      rayCount: 16,
      speed: 0.35,
      intensity: 3.2,
      distort: 0.8,
      colors: ["#ff007a", "#4d3dff", "#ffffff"],
    };
  }, [perfMode]);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {/* Fondo */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        {bgProps.use === "static" ? (
          // Gradiente estático (sin animación, muy barato)
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.45), transparent 60%), radial-gradient(1200px 800px at 80% 90%, rgba(236,72,153,0.4), transparent 60%), linear-gradient(180deg, #0b0b12, #12121a)",
            }}
          />
        ) : (
          <Suspense
            fallback={
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background:
                    "linear-gradient(180deg, #0b0b12 0%, #12121a 100%)",
                }}
              />
            }
          >
            <PrismaticBurst
              animationType="rotate3d"
              intensity={bgProps.intensity}
              speed={bgProps.speed}
              distort={bgProps.distort}
              paused={false}
              offset={{ x: 0, y: 0 }}
              hoverDampness={0.2}
              rayCount={bgProps.rayCount}
              mixBlendMode="normal"
              colors={bgProps.colors}
            />
          </Suspense>
        )}
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
          {/* Título: desactivar animación en modos modestos */}
          {perfMode === "full" ? (
            <Suspense fallback={<h1 className="text-4xl font-extrabold">Pixel Phone</h1>}>
              <Shuffle
                text="Pixel Phone"
                className="pixel-title"
                shuffleDirection="right"
                duration={0.3}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power3.out"
                stagger={0.02}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={false}
                respectReducedMotion={true}
              />
            </Suspense>
          ) : (
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Pixel Phone
            </h1>
          )}

          {/* Dos “botones” */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* ADMIN */}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setOpenAdmin(true);
              }}
              className="no-underline inline-block text-left focus:outline-none"
              aria-label="Entrar como administrador"
            >
              <PixelCard variant="blue">
                <div className="flex flex-col items-center gap-3">
                  <IoMdGlobe size={40} />
                  <h2 className="text-2xl sm:text-3xl font-extrabold">Administrador</h2>
                  <p className="text-sm text-white/80 max-w-[220px]">
                    Crea y controla eventos, colores y efectos.
                  </p>
                </div>
              </PixelCard>
            </button>

            {/* PIXEL USER */}
            <button
              type="button"
              onClick={() => setOpenPixel(true)}
              className="no-underline inline-block text-left focus:outline-none"
              aria-label="Unirse como Pixel User"
            >
              <PixelCard variant="pink">
                <div className="flex flex-col items-center gap-3">
                  <TbCheckupList size={40} />
                  <h2 className="text-2xl sm:text-3xl font-extrabold">Pixel User</h2>
                  <p className="text-sm text-white/80 max-w-[220px]">
                    Únete con un código QR y sé un “pixel”.
                  </p>
                </div>
              </PixelCard>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Admin */}
      <Modal
        open={openAdmin}
        onClose={() => setOpenAdmin(false)}
        title={mode === "login" ? "Iniciar sesión (Administrador)" : "Crear cuenta (Administrador)"}
        perfMode={perfMode}
      >
        {/* Tabs simples */}
        <div className="mb-4 flex rounded-xl overflow-hidden border border-gray-200">
          <button
            className={`flex-1 px-4 py-2 text-sm font-semibold ${
              mode === "login" ? "bg-indigo-600 text-white" : "bg-white"
            }`}
            onClick={() => setMode("login")}
          >
            Iniciar sesión
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-semibold ${
              mode === "signup" ? "bg-indigo-600 text-white" : "bg-white"
            }`}
            onClick={() => setMode("signup")}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleAdminSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Tu nombre"
              />
            </div>
          )}

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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          {infoMsg && <p className="text-sm text-amber-600">{infoMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {loading
              ? mode === "login"
                ? "Ingresando…"
                : "Creando cuenta…"
              : mode === "login"
              ? "Iniciar sesión"
              : "Registrarme"}
          </button>

          <p className="text-xs text-gray-500 text-center">
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="underline text-indigo-600 hover:text-indigo-700"
                >
                  Crear cuenta
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="underline text-indigo-600 hover:text-indigo-700"
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </p>
        </form>
      </Modal>

      {/* MODAL: Pixel User */}
      <Modal open={openPixel} onClose={() => setOpenPixel(false)} title="Unirse como Pixel User" perfMode={perfMode}>
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
