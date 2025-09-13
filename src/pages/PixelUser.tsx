// src/pages/PixelUser.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../libs/supabaseClient"; // ajusta ruta si usas ../lib/
type EffectKind = "solid" | "blink" | "wave" | "gradient";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

interface EffectPayload {
  effect: EffectKind;
  colors: [string, string];
  speedMs: number;
  intensity: number; // 0.1–1
}

export default function PixelUser() {
  const navigate = useNavigate();
  const query = useQuery();

  // ===== Params / persistencia simple =====
  const eventId = useMemo(() => {
    const q = query.get("event")?.trim() || "";
    return q || localStorage.getItem("currentEventName") || "";
  }, [query]);

  const auto = query.get("auto") === "1";

  const deviceKey = useMemo(
    () => localStorage.getItem("pixel:deviceKey") || (() => {
      const k = "client-" + Math.random().toString(36).slice(2);
      localStorage.setItem("pixel:deviceKey", k);
      return k;
    })(),
    []
  );

  // Fase aleatoria para wave (distribuye el patrón entre dispositivos)
  const phase = useMemo(() => {
    const k = localStorage.getItem("pixel:phase");
    if (k) return Number(k) || 0;
    const v = Math.floor(Math.random() * 1000);
    localStorage.setItem("pixel:phase", String(v));
    return v;
  }, []);

  // ===== Estado visual =====
  const [bg, setBg] = useState<string>("#000000");
  const [useGradient, setUseGradient] = useState(false);
  const [gradCSS, setGradCSS] = useState<string>(""); // para gradient
  const [eventName, setEventName] = useState<string>("");

  // Efecto en curso
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const musicModeRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ===== Helpers =====
  const clearTimers = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const stopVisuals = useCallback(() => {
    clearTimers();
    setUseGradient(false);
    setBg("#000000");
  }, [clearTimers]);

  const startSolid = useCallback((p: EffectPayload) => {
    clearTimers();
    setUseGradient(false);
    setBg(p.colors[0]);
  }, [clearTimers]);

  const startBlink = useCallback((p: EffectPayload) => {
    clearTimers();
    setUseGradient(false);
    const on = p.colors[0];
    const off = "#000000";
    let state = false;
    setBg(off);
    intervalRef.current = window.setInterval(() => {
      state = !state;
      setBg(state ? on : off);
    }, Math.max(50, p.speedMs));
  }, [clearTimers]);

  const startWave = useCallback((p: EffectPayload) => {
    clearTimers();
    setUseGradient(false);
    const a = p.colors[0];
    const off = "#000000";
    const period = Math.max(120, p.speedMs); // ms por ciclo
    const myOffset = (phase % period);       // desfase por dispositivo

    const loop = () => {
      const t = (Date.now() + myOffset) % period;
      // seno 0..1 -> umbral por intensidad
      const s = (Math.sin((t / period) * Math.PI * 2) + 1) / 2;
      const on = s > (1 - p.intensity);
      setBg(on ? a : off);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [clearTimers, phase]);

  const startGradient = useCallback((p: EffectPayload) => {
    clearTimers();
    setUseGradient(true);
    let angle = 0;
    const step = Math.max(0.03, 1000 / Math.max(60, p.speedMs)); // deg/frame aproximado
    const loop = () => {
      angle = (angle + step) % 360;
      setGradCSS(`linear-gradient(${angle}deg, ${p.colors[0]}, ${p.colors[1]})`);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [clearTimers]);

  const startEffect = useCallback((payload: EffectPayload, startAt?: number) => {
    const run = () => {
      switch (payload.effect) {
        case "solid": startSolid(payload); break;
        case "blink": startBlink(payload); break;
        case "wave": startWave(payload); break;
        case "gradient": startGradient(payload); break;
      }
    };
    if (startAt && startAt > Date.now()) {
      const delay = Math.min(5000, startAt - Date.now());
      setTimeout(run, delay);
    } else {
      run();
    }
  }, [startSolid, startBlink, startWave, startGradient]);

  // Pequeño flash cuando llega un "clap" del modo música
  const flashRef = useRef<number | null>(null);
  const doFlash = useCallback(() => {
    if (flashRef.current) window.clearTimeout(flashRef.current);
    const prev = { bgSnapshot: bg, gradSnapshot: gradCSS, gradOn: useGradient };
    setUseGradient(false);
    setBg("#ffffff");
    flashRef.current = window.setTimeout(() => {
      if (prev.gradOn) { setUseGradient(true); setGradCSS(prev.gradSnapshot); }
      else { setBg(prev.bgSnapshot); }
    }, 90);
  }, [bg, gradCSS, useGradient]);

  // ===== Conexión Realtime =====
  useEffect(() => {
    const id = (eventId || "").trim();
    if (!id) return; // si no hay evento, no conectamos

    setEventName(id);
    localStorage.setItem("currentEventName", id);

    // Canal
    const ch = supabase.channel(`event:${id}`, {
      config: { broadcast: { ack: true }, presence: { key: deviceKey } },
    });

    ch.on("broadcast", { event: "cmd" }, (msg) => {
      const { type, startAt, payload } = (msg.payload || {}) as {
        type: "effect" | "stop";
        startAt?: number;
        payload?: EffectPayload;
      };
      if (type === "stop") stopVisuals();
      if (type === "effect" && payload) startEffect(payload, startAt);
    });

    ch.on("broadcast", { event: "mode" }, (msg) => {
      const { music } = (msg.payload || {}) as { music?: boolean };
      musicModeRef.current = !!music;
    });

    ch.on("broadcast", { event: "sensor" }, (msg) => {
      const { clap } = (msg.payload || {}) as { level?: number; clap?: boolean };
      if (musicModeRef.current && clap) doFlash();
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.track({ role: "client", phase, t: Date.now() });
      }
    });

    channelRef.current = ch;
    return () => { ch.unsubscribe(); channelRef.current = null; };
  }, [eventId, deviceKey, phase, doFlash, startEffect, stopVisuals]);

  // ===== Fullscreen / WakeLock si viene auto=1 =====
  useEffect(() => {
    if (!auto) return;
    const tryFs = async () => {
      try {
        // Algunos navegadores exigen interacción; si falla, simplemente continúa
        await document.documentElement.requestFullscreen?.();
        
        if ("wakeLock" in navigator) { await (navigator as any).wakeLock.request("screen"); }
      } catch {}
    };
    tryFs();
  }, [auto]);

  // ===== Interacción local mínima (fallback) =====
  const handleTap = () => {
    // Si no hay efecto activo, alterna a modo demo
    if (!intervalRef.current && !rafRef.current) {
      setBg((c) => (c === "#000000" ? "#ffffff" : "#000000"));
    }
  };

  const handleLeave = () => {
    localStorage.removeItem("currentEventName");
    try { channelRef.current?.unsubscribe(); } catch {}
    stopVisuals();
    navigate("/");
  };

  // ===== Render =====
  return (
    <div className="relative w-screen" style={{ minHeight: "100dvh", touchAction: "manipulation" }}>
      {/* Superficie del “pixel” */}
      <div
        onClick={handleTap}
        className="absolute inset-0"
        style={{
          background: useGradient ? gradCSS : bg,
          transition: useGradient ? "none" : "background-color 120ms linear",
        }}
      />

      {/* Barra inferior con nombre del evento + salir */}
      <div
        className="pointer-events-auto fixed inset-x-0 bottom-0"
        style={{
          padding: "12px 16px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          background: "linear-gradient(0deg, rgba(0,0,0,0.65), rgba(0,0,0,0.35), rgba(0,0,0,0))",
        }}
      >
        <div className="mx-auto max-w-md rounded-xl border border-white/15 bg-black/55 backdrop-blur-md px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Evento</p>
              <p className="text-base font-semibold">{eventId || eventName || "—"}</p>
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
