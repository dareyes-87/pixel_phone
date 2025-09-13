// src/pages/AdminPage.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Squares from "../components/Squares";
import Shuffle from "../components/Shuffle";
import QRCode from "qrcode";
import { TbLogout } from "react-icons/tb";
import { supabase } from "../libs/supabaseClient"; // ajusta a ../lib/ si aplica

type EffectKind = "solid" | "blink" | "wave" | "gradient";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ======= Estado base =======
  const [eventId, setEventId] = useState<string>(() => localStorage.getItem("olas:eventId") || "");
  const [connected, setConnected] = useState(false);
  const [count, setCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const adminKey = useMemo(() => "admin-" + Math.random().toString(36).slice(2), []);

  // Efectos
  const [effect, setEffect] = useState<EffectKind>("solid");
  const [colorA, setColorA] = useState("#00fff2");
  const [colorB, setColorB] = useState("#09233a");
  const [speed, setSpeed] = useState(500);
  const [intensity, setIntensity] = useState(1);

  // QR
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [clientUrl, setClientUrl] = useState("");
  const [qrFallbackSrc, setQrFallbackSrc] = useState<string | null>(null);

  // Web Serial
  const [serialStatus, setSerialStatus] = useState<"Desconectado" | "Conectado" | "Error/Cancelado">("Desconectado");
  const sensRef = useRef(80);
  const serialReaderRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const serialPortRef = useRef<any>(null);

  useEffect(() => { document.title = "Panel Admin"; }, []);

  // Precargar ?eid=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eid = params.get("eid");
    if (eid) {
      setEventId(eid);
      localStorage.setItem("olas:eventId", eid);
    }
  }, []);

  // ======= Utils =======
  const buildClientUrl = useCallback(() => {
    const id = (eventId || "").trim();
    const qs = new URLSearchParams({ event: id, auto: "1" }).toString();
    return `${window.location.origin}/pixel?${qs}`; // cliente React
  }, [eventId]);

  const renderQr = useCallback(async () => {
    const url = buildClientUrl();
    setClientUrl(url);
    const canvas = qrCanvasRef.current;
    setQrFallbackSrc(null);
    if (!canvas) return;
    try {
      await QRCode.toCanvas(canvas, url, { width: 220, margin: 1 });
    } catch {
      setQrFallbackSrc(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`);
    }
  }, [buildClientUrl]);

  useEffect(() => { renderQr(); }, [eventId, renderQr]);

  // ======= Realtime =======
  const connect = useCallback(async () => {
    const id = (eventId || "").trim();
    if (!id) return alert("Ingresa un Event ID");
    localStorage.setItem("olas:eventId", id);

    if (channelRef.current) {
      try { await channelRef.current.unsubscribe(); } catch {}
      channelRef.current = null;
    }

    const channel = supabase.channel(`event:${id}`, {
      config: { broadcast: { ack: true }, presence: { key: adminKey } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, any[]>;
      let total = 0;
      for (const k in state) total += state[k].length;
      setCount(total);
    });

    await channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ role: "admin", t: Date.now() });
        setConnected(true);
        renderQr(); // asegura que el QR apunte al evento vigente
      }
    });

    channelRef.current = channel;
  }, [eventId, adminKey, renderQr]);

  const disconnect = useCallback(async () => {
    if (channelRef.current) {
      try { await channelRef.current.unsubscribe(); } catch {}
      channelRef.current = null;
    }
    setConnected(false);
    setCount(0);
  }, []);

  // Crear (solo guarda/actualiza, NO conecta)
  const createEvent = useCallback(async () => {
    const id = eventId.trim();
    if (!id) { alert("Escribe un nombre/ID de evento"); return; }

    // Si ya había conexión, la cerramos para evitar mezclar eventos
    if (channelRef.current) {
      try { await channelRef.current.unsubscribe(); } catch {}
      channelRef.current = null;
      setConnected(false);
      setCount(0);
    }

    localStorage.setItem("olas:eventId", id);
    await renderQr(); // refresca el QR del cliente
  }, [eventId, renderQr]);

  const payloadEffect = useCallback(() => ({
    effect,
    colors: [colorA, colorB] as [string, string],
    speedMs: Math.max(50, Number(speed) || 500),
    intensity: Math.min(1, Math.max(0.1, Number(intensity) || 1)),
  }), [effect, colorA, colorB, speed, intensity]);

  const sendEffect = useCallback(async (start = true) => {
    const ch = channelRef.current;
    if (!ch) return alert("Conéctate primero");
    const startAt = start ? Date.now() + 1000 : undefined;
    await ch.send({
      type: "broadcast",
      event: "cmd",
      payload: { type: "effect", startAt, payload: payloadEffect() },
    });
  }, [payloadEffect]);

  const stopAll = useCallback(async () => {
    const ch = channelRef.current;
    if (!ch) return;
    await ch.send({ type: "broadcast", event: "cmd", payload: { type: "stop" } });
  }, []);

  // ======= Modo música (USB) =======
  const setMusicMode = useCallback(async (on: boolean) => {
    const ch = channelRef.current;
    if (!ch) return alert("Conéctate al evento primero");
    await ch.send({ type: "broadcast", event: "mode", payload: { music: !!on } });
  }, []);

  const connectSerial = useCallback(async () => {
  try {
    if (!("serial" in navigator)) {
      alert("Tu navegador no soporta Web Serial");
      return;
    }
    // @ts-expect-error
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 }); // tu UNO R3
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();
    serialReaderRef.current = reader;
    serialPortRef.current = port;
    setSerialStatus("Conectado");

    (async function readSerialLoop() {
      let buffer = "";
      try {
        while (serialReaderRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          buffer += value;
          let idx;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);

            // -------- A PARTIR DE AQUÍ: NORMALIZACIÓN Y ENVÍO --------
            const level = parseInt(line, 10);
            if (Number.isNaN(level)) continue;

            // 1) baseline por EMA
            baseRef.current =
              baseRef.current === 0
                ? level
                : baseRef.current * 0.98 + level * 0.02;

            // 2) desviación sobre el baseline
            const dev = Math.max(0, level - baseRef.current);

            // 3) pico dinámico con suave decaimiento
            peakRef.current = Math.max(
              dev,
              peakRef.current * 0.995 + 1e-6
            );

            // 4) normalización 0..1 + curva gamma + low-pass
            let norm = dev / (peakRef.current || 1);
            norm = Math.pow(Math.max(0, Math.min(1, norm)), 0.6);
            normLPFRef.current = normLPFRef.current * 0.7 + norm * 0.3;

            // 5) umbral de palmada según sensibilidad (10..300 -> ~0.05..0.9)
            const thr = Math.max(0.05, Math.min(0.9, sensRef.current / 300));
            const clap = normLPFRef.current > thr;

            // 6) throttle ~40 Hz
            const now = Date.now();
            if (now - lastSentRef.current > 25) {
              lastSentRef.current = now;
              const ch = channelRef.current;
              if (ch) {
                ch.send({
                  type: "broadcast",
                  event: "sensor",
                  payload: { norm: normLPFRef.current, clap },
                });
              }
            }
            // -------- FIN DEL BLOQUE DE NORMALIZACIÓN --------
          }
        }
      } catch {
        // ignore
      } finally {
        setSerialStatus("Desconectado");
        try { await reader.releaseLock(); } catch {}
        try { await port.close(); } catch {}
        serialReaderRef.current = null;
        serialPortRef.current = null;
      }
    })();
  } catch (e) {
    console.error(e);
    setSerialStatus("Error/Cancelado");
  }
}, []);


  // Filtros para normalización
const baseRef     = useRef(0);   // baseline (EMA)
const peakRef     = useRef(1);   // pico dinámico que decae
const normLPFRef  = useRef(0);   // suavizado de norm
const lastSentRef = useRef(0);   // throttle de envío


  useEffect(() => {
    // cleanup al desmontar
    return () => {
      disconnect();
      (async () => {
        try { await serialReaderRef.current?.cancel?.(); } catch {}
        try { await serialPortRef.current?.close?.(); } catch {}
      })();
    };
  }, [disconnect]);

  // ======= Logout =======
  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  // ======= UI =======
  return (
    <div className="relative min-h-screen text-white bg-[#0e0f16]" style={{ isolation: "isolate" }}>
      {/* Fondo animado */}
      <div className="absolute inset-0 z-0 pointer-events-none p-3">
        <Squares
          direction="diagonal"
          speed={0.28}
          squareSize={38}
          borderColor="#b9bcd1"
          backgroundColor="#0e0f16"
          gridOpacity={0.22}
          lineWidth={0.8}
          vignetteStrength={0.5}
          centerGlow={0.07}
          hoverFillColor="#171922"
        />
      </div>

      {/* Contenido */}
      <div className="relative z-10 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="rounded-[24px] border border-white/15 bg-white/[0.04] backdrop-blur-sm p-6 sm:p-8 lg:p-10">
          {/* Header */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <Shuffle
                text="PANEL ADMIN"
                className="text-5xl md:text-7xl font-extrabold leading-none tracking-wide"
                shuffleDirection="right"
                duration={0.35}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power3.out"
                stagger={0.03}
                threshold={0.1}
                triggerOnce
                respectReducedMotion
              />
              <p className="text-white/70 text-sm mt-3">
                Sesión: <span className="font-semibold">{user?.email}</span>
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 border border-white/10 transition-colors"
            >
              <TbLogout size={18} />
              Cerrar sesión
            </button>
          </header>

          {/* Evento / Conexión */}
          <section className="rounded-2xl bg-white/5 p-4 border border-white/10 mb-6">
            <h2 className="font-semibold mb-3">Evento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Col 1: Event ID */}
              <div>
                <label className="block text-sm mb-1">Event ID</label>
                <input
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                  placeholder="MI-EVENTO-2025"
                />
              </div>

              {/* Col 2: Crear */}
              <div className="flex items-end">
                <button
                  onClick={createEvent}
                  className="w-full rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
                >
                  Crear
                </button>
              </div>

              {/* Col 3: Conectar / Desconectar + contador */}
              <div className="flex items-end gap-3">
                <button
                  onClick={connect}
                  disabled={connected}
                  className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20 disabled:opacity-60"
                >
                  Conectar
                </button>
                <button
                  onClick={disconnect}
                  disabled={!connected}
                  className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20 disabled:opacity-60"
                >
                  Desconectar
                </button>
                <div className="self-center text-sm text-white/70">· Conectados: <b>{count}</b></div>
              </div>
            </div>
          </section>

          {/* Cliente rápido (QR & Link) */}
          <section className="rounded-2xl bg-white/5 p-4 border border-white/10 mb-6">
            <h2 className="font-semibold mb-3">Cliente rápido (QR & Link)</h2>
            <div className="flex flex-wrap items-start gap-6">
              {qrFallbackSrc ? (
                <img
                  src={qrFallbackSrc}
                  alt="QR"
                  width={220}
                  height={220}
                  style={{ background: "#fff", borderRadius: 10 }}
                />
              ) : (
                <canvas
                  ref={qrCanvasRef}
                  width={220}
                  height={220}
                  style={{ background: "#fff", borderRadius: 10 }}
                />
              )}
              <div className="min-w-[260px]">
                <label className="block text-sm mb-1">URL del cliente</label>
                <input
                  readOnly
                  value={clientUrl}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                />
                <div className="flex gap-3 mt-3">
                  <a
                    href={clientUrl}
                    target="_blank"
                    className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
                  >
                    Abrir Cliente
                  </a>
                  <button
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(clientUrl); alert("¡Copiado!"); } catch {}
                    }}
                    className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
                  >
                    Copiar link
                  </button>
                </div>
                <small className="text-white/60 block mt-2">
                  Escribe el ID y pulsa <b>Crear</b> para generar/actualizar el QR.
                </small>
              </div>
            </div>
          </section>

          {/* Efectos */}
          <section className="rounded-2xl bg-white/5 p-4 border border-white/10 mb-6">
            <h2 className="font-semibold mb-3">Efectos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm mb-1">Efecto</label>
                <select
                  value={effect}
                  onChange={(e) => setEffect(e.target.value as EffectKind)}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                >
                  <option value="solid">Color sólido</option>
                  <option value="blink">Parpadeo</option>
                  <option value="wave">Ola</option>
                  <option value="gradient">Gradiente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Color A</label>
                <input
                  type="color"
                  value={colorA}
                  onChange={(e) => setColorA(e.target.value)}
                  className="w-full h-[42px] rounded-lg bg-black/30 border border-white/10 px-1"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Color B</label>
                <input
                  type="color"
                  value={colorB}
                  onChange={(e) => setColorB(e.target.value)}
                  className="w-full h-[42px] rounded-lg bg-black/30 border border-white/10 px-1"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Velocidad (ms)</label>
                <input
                  type="number"
                  min={50}
                  step={10}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Intensidad (0.1–1.0)</label>
                <input
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                />
              </div>
              <div className="flex items-end gap-3">
                <button
                  onClick={() => sendEffect(true)}
                  className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
                >
                  Iniciar (1s)
                </button>
                <button
                  onClick={stopAll}
                  className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
                >
                  Detener
                </button>
              </div>
            </div>
          </section>

          {/* Ritmo de la música (USB) */}
          <section className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <h2 className="font-semibold mb-3">Ritmo de la música (USB)</h2>
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <button
                onClick={connectSerial}
                className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
              >
                Conectar Arduino
              </button>
              <label className="text-sm">Sensibilidad</label>
              <input
                type="range"
                min={10}
                max={300}
                defaultValue={80}
                onChange={(e) => (sensRef.current = Number(e.target.value))}
                className="w-[220px]"
              />
              <span className="text-xs text-white/60">Estado: {serialStatus}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMusicMode(true)}
                className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
              >
                Activar modo
              </button>
              <button
                onClick={() => setMusicMode(false)}
                className="rounded-lg bg-white/10 px-4 py-2 border border-white/10 hover:bg-white/20"
              >
                Desactivar
              </button>
            </div>
            <p className="text-xs text-white/60 mt-2">
              Web Serial funciona en Chrome/Edge con <b>https</b> o <b>localhost</b>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
