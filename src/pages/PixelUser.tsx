import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PixelUser() {
  const navigate = useNavigate();
  const query = useQuery();

  // Lee el nombre del evento del querystring o de localStorage (persistencia simple)
  const eventName = useMemo(() => {
    const q = query.get("event");
    return q || localStorage.getItem("currentEventName") || "Evento de práctica";
  }, [query]);

  const [color, setColor] = useState<string>("#000000");

  useEffect(() => {
    if (eventName) localStorage.setItem("currentEventName", eventName);
    setColor("#000000");
  }, [eventName]);

  // DEMO: tocar la pantalla alterna color (simula parpadeo)
  const handleTap = () => {
    setColor((c) => (c === "#000000" ? "#ffffff" : "#000000"));
  };

  const handleLeave = () => {
    localStorage.removeItem("currentEventName");
    navigate("/");
  };

  return (
    <div
      className="relative w-screen"
      style={{ minHeight: "100dvh", touchAction: "manipulation" }} // 100dvh para móvil + gestos
    >
      {/* Superficie del “pixel” */}
      <div
        onClick={handleTap}
        className="absolute inset-0"
        style={{ backgroundColor: color, transition: "background-color 120ms linear" }}
      />

      {/* Barra inferior con nombre del evento + salir */}
      <div
        className="pointer-events-auto fixed inset-x-0 bottom-0"
        style={{
          padding: "12px 16px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)", // notch iOS
          background: "linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0.35), rgba(0,0,0,0))",
        }}
      >
        <div className="mx-auto max-w-md rounded-xl border border-white/15 bg-black/50 backdrop-blur-md px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Evento</p>
              <p className="text-base font-semibold">{eventName}</p>
            </div>
            <button
              onClick={handleLeave}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 border border-white/10"
            >
              Salir del evento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
