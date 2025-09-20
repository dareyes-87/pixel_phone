// src/pages/PixelUser.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../libs/supabaseClient";

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

// ====== S O N I D O S ======
import aplausos from "../sounds/aplausos.wav";
import coin from "../sounds/coin.mp3";
import errorSnd from "../sounds/error.wav";
import latigo from "../sounds/latigo.mp3";
import platillos from "../sounds/platillos.mp3";
import redoble from "../sounds/redoble.mp3";
import suspenso from "../sounds/suspenso.mp3";
import tambor from "../sounds/tambor.mp3";
import triste from "../sounds/triste.mp3";

const soundMap: Record<number, string> = {
  1: aplausos,
  2: coin,
  3: errorSnd,
  4: latigo,
  5: platillos,
  6: redoble,
  7: suspenso,
  8: tambor,
  9: triste,
};

// helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function lerpColor(aHex: string, bHex: string, t: number) {
  const a = parseInt(aHex.replace("#", ""), 16);
  const b = parseInt(bHex.replace("#", ""), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${b2})`;
}

export default function PixelUser() {
  const navigate = useNavigate();
  const query = useQuery();

  // ===== Params / persistencia =====
  const eventId = useMemo(() => {
    const q = query.get("event")?.trim() || "";
    return q || localStorage.getItem("currentEventName") || "";
  }, [query]);

  const auto = query.get("auto") === "1";

  const deviceKey = useMemo(
    () =>
      localStorage.getItem("pixel:deviceKey") ||
      (() => {
        const k = "client-" + Math.random().toString(36).slice(2);
        localStorage.setItem("pixel:deviceKey", k);
        return k;
      })(),
    []
  );

  // Fase aleatoria para wave
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
  const [gradCSS, setGradCSS] = useState<string>("");
  const [eventName, setEventName] = useState<string>("");

  // Último efecto (modo música)
  const lastEffectRef = useRef<EffectPayload | null>(null);

  // Relojes / flags
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const musicModeRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ===== Wake Lock / Fullscreen =====
  const wakeRef = useRef<any>(null);
  const requestWakeLock = useCallback(async () => {
    try {
      
      wakeRef.current = await navigator.wakeLock?.request?.("screen");
      document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible" && wakeRef.current?.released) {
          try {
            
            wakeRef.current = await navigator.wakeLock?.request?.("screen");
          } catch {}
        }
      });
    } catch {}
  }, []);
  const releaseWakeLock = useCallback(async () => {
    try { await wakeRef.current?.release?.(); } catch {}
    wakeRef.current = null;
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
      // @ts-expect-error
      await screen.orientation?.lock?.("portrait");
    } catch {}
  }, []);

  // Wake Lock desde el inicio (sin interacción)
  useEffect(() => {
    (async () => { await requestWakeLock(); })();
    return () => { releaseWakeLock(); };
  }, [requestWakeLock, releaseWakeLock]);

  // ===== Helpers =====
  const clearTimers = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopVisuals = useCallback(() => {
    clearTimers();
    setUseGradient(false);
    setBg("#000000");
    setTorch(false); // apaga linterna al detener
  }, [clearTimers]);

  // ===== Linterna (torch) =====
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);
  const torchOnRef = useRef(false);

  const setTorch = useCallback(async (on: boolean) => {
    try {
      if (on) {
        if (!torchTrackRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } as any }
          });
          const t = stream.getVideoTracks()[0];
          // @ts-expect-error
          await t.applyConstraints({ advanced: [{ torch: true }] });
          torchTrackRef.current = t;
        } else {
          // @ts-expect-error
          await torchTrackRef.current.applyConstraints({ advanced: [{ torch: true }] });
        }
        torchOnRef.current = true;
      } else {
        if (torchTrackRef.current) {
          try {
            // @ts-expect-error
            await torchTrackRef.current.applyConstraints({ advanced: [{ torch: false }] });
          } catch {}
        }
        torchTrackRef.current?.stop?.();
        torchTrackRef.current = null;
        torchOnRef.current = false;
      }
    } catch (e) {
      console.warn("Torch no soportado, fallback visual:", e);
      setUseGradient(false);
      setBg(on ? "#ffffff" : "#000000");
      torchOnRef.current = on;
    }
  }, []);

  // ===== Efectos (con linterna integrada) =====
  const startSolid = useCallback(
    (p: EffectPayload) => {
      clearTimers();
      setUseGradient(false);
      setBg(p.colors[0]);
      setTorch(true); // linterna encendida
    },
    [clearTimers, setTorch]
  );

  const startBlink = useCallback(
    (p: EffectPayload) => {
      clearTimers();
      setUseGradient(false);
      const onCol = p.colors[0];
      const offCol = "#000000";
      let state = false;
      setBg(offCol);
      intervalRef.current = window.setInterval(() => {
        state = !state;
        setBg(state ? onCol : offCol);
        setTorch(state); // sincroniza con parpadeo
      }, Math.max(50, p.speedMs));
    },
    [clearTimers, setTorch]
  );

  const startWave = useCallback(
    (p: EffectPayload) => {
      clearTimers();
      setUseGradient(false);
      const a = p.colors[0];
      const off = "#000000";
      const period = Math.max(120, p.speedMs);
      const myOffset = phase % period;
      let lastTorch = torchOnRef.current;

      const loop = () => {
        const t = (Date.now() + myOffset) % period;
        const s = (Math.sin((t / period) * Math.PI * 2) + 1) / 2;
        const on = s > (1 - p.intensity);
        setBg(on ? a : off);
        if (on !== lastTorch) {
          lastTorch = on;
          setTorch(on);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [clearTimers, phase, setTorch]
  );

  const startGradient = useCallback(
    (p: EffectPayload) => {
      clearTimers();
      setUseGradient(true);
      setTorch(false); // linterna apagada en gradiente
      let angle = 0;
      const step = Math.max(0.03, 1000 / Math.max(60, p.speedMs));
      const loop = () => {
        angle = (angle + step) % 360;
        setGradCSS(`linear-gradient(${angle}deg, ${p.colors[0]}, ${p.colors[1]})`);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [clearTimers, setTorch]
  );

  const startEffect = useCallback(
    (payload: EffectPayload, startAt?: number) => {
      lastEffectRef.current = payload;
      const run = () => {
        switch (payload.effect) {
          case "solid":    startSolid(payload); break;
          case "blink":    startBlink(payload); break;
          case "wave":     startWave(payload); break;
          case "gradient": startGradient(payload); break;
        }
      };
      if (startAt && startAt > Date.now()) {
        const delay = Math.min(5000, startAt - Date.now());
        setTimeout(run, delay);
      } else {
        run();
      }
    },
    [startSolid, startBlink, startWave, startGradient]
  );

  // Flash visual por CLAP (modo música)
  const flashRef = useRef<number | null>(null);
  const doFlash = useCallback(() => {
    if (flashRef.current) window.clearTimeout(flashRef.current);
    const prev = { bgSnapshot: bg, gradSnapshot: gradCSS, gradOn: useGradient };
    setUseGradient(false);
    setBg("#ffffff");
    flashRef.current = window.setTimeout(() => {
      if (prev.gradOn) {
        setUseGradient(true);
        setGradCSS(prev.gradSnapshot);
      } else {
        setBg(prev.bgSnapshot);
      }
    }, 90);
  }, [bg, gradCSS, useGradient]);

  // ===== Audio (WebAudio con precarga) =====
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const [needsTap, setNeedsTap] = useState(true);

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current!;
  }, []);

  const preloadSounds = useCallback(async () => {
    const ctx = ensureAudioCtx();
    const entries = Object.entries(soundMap) as [string, string][];
    await Promise.all(entries.map(async ([k, url]) => {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      buffersRef.current.set(Number(k), buf);
    }));
  }, [ensureAudioCtx]);

  // desbloqueo por primer toque
  useEffect(() => {
    const onTap = async () => {
      try {
        const ctx = ensureAudioCtx();
        if (ctx.state !== "running") await ctx.resume();
        if (buffersRef.current.size === 0) await preloadSounds();
        setNeedsTap(false);
      } catch (e) {
        console.warn("Audio unlock error:", e);
      }
    };
    window.addEventListener("pointerdown", onTap, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", onTap);
  }, [ensureAudioCtx, preloadSounds]);

  const playSound = useCallback(async (id: number) => {
    const ctx = ensureAudioCtx();
    if (ctx.state !== "running") {
      setNeedsTap(true);
      try { await ctx.resume(); } catch {}
      if (ctx.state !== "running") return;
    }
    if (buffersRef.current.size === 0) {
      try { await preloadSounds(); } catch {}
    }
    const buf = buffersRef.current.get(id);
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }, [ensureAudioCtx, preloadSounds]);

  // ===== Conexión Realtime =====
  useEffect(() => {
    const id = (eventId || "").trim();
    if (!id) return;

    setEventName(id);
    localStorage.setItem("currentEventName", id);

    const ch = supabase.channel(`event:${id}`, {
      config: { broadcast: { ack: true }, presence: { key: deviceKey } },
    });

    ch.on("broadcast", { event: "cmd" }, (msg) => {
      const p: any = msg.payload || {};
      const { type, startAt, payload } = p;

      if (type === "stop") {
        stopVisuals();
        return;
      }

      if (type === "effect" && payload) {
        startEffect(payload as EffectPayload, startAt);
        return;
      }

      // Soporta { type:'sound', id } o { type:'sound', payload:{id} }
      if (type === "sound") {
        const idNum = Number(p?.id ?? (payload as any)?.id) || 1;
        playSound(idNum);
        return;
      }

      // (opcional: compatibilidad si alguna vez se envía flash directo)
      if (type === "flash") {
        const desired = typeof p?.on === "boolean" ? !!p.on : !torchOnRef.current;
        setTorch(desired);
        return;
      }
    });

    ch.on("broadcast", { event: "mode" }, (msg) => {
      const { music } = (msg.payload || {}) as { music?: boolean };
      musicModeRef.current = !!music;
    });

    // amplitud normalizada desde admin (sensor)
    ch.on("broadcast", { event: "sensor" }, (msg) => {
      const { norm, clap } = (msg.payload || {}) as { norm?: number; clap?: boolean };
      if (!musicModeRef.current) return;

      if (clap) {
        doFlash();
        // Si quieres flash real con linterna en cada palmada, descomenta:
        // setTorch(true); setTimeout(() => setTorch(false), 90);
      }

      if (typeof norm === "number") {
        const eff = lastEffectRef.current;
        if (!eff) return;
        const t = clamp01(norm);
        const mixed = lerpColor(eff.colors[1], eff.colors[0], t); // B->A
        setUseGradient(false);
        setBg(mixed);
      }
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.track({ role: "client", phase, t: Date.now() });
      }
    });

    channelRef.current = ch;
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [eventId, deviceKey, phase, doFlash, startEffect, stopVisuals, setTorch, playSound]);

  // Fullscreen si viene auto=1
  useEffect(() => {
    if (!auto) return;
    (async () => {
      await enterFullscreen();
    })();
  }, [auto, enterFullscreen]);

  // Interacción local mínima (fallback)
  const handleTap = () => {
    if (!intervalRef.current && !rafRef.current) {
      setBg((c) => (c === "#000000" ? "#ffffff" : "#000000"));
    }
  };

  const handleLeave = () => {
    localStorage.removeItem("currentEventName");
    try { channelRef.current?.unsubscribe(); } catch {}
    clearTimers();
    setTorch(false);
    releaseWakeLock();
    navigate("/");
  };

  // Render
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

      {/* Aviso para brillo/audio */}
      {needsTap && (
        <div
          className="pointer-events-none fixed top-0 inset-x-0 text-center text-white text-sm"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))",
            padding: "10px 12px",
          }}
        >
          Sube el brillo al máximo y toca la pantalla una vez para habilitar el audio 🔊
        </div>
      )}

      {/* Barra inferior */}
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleLeave}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 border border-white/10"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
