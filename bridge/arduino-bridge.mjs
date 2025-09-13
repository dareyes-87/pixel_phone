// bridge/arduino-bridge.mjs
import 'dotenv/config';
import { SerialPort, ReadlineParser } from 'serialport';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  EVENT_ID = 'FIESTA-2025',
  SERIAL_PORT = process.platform === 'win32' ? 'COM3' : '/dev/ttyUSB0',
  BAUD = '9600',
  SENSITIVITY = '80',
  SAMPLE_HZ = '40',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const channel = sb.channel(`event:${EVENT_ID}`, {
  config: { broadcast: { ack: false }, presence: { key: 'bridge-' + Math.random().toString(36).slice(2) } },
});
await new Promise((res) => channel.subscribe((st) => st === 'SUBSCRIBED' && res()));
console.log(`[Bridge] Conectado a canal event:${EVENT_ID}`);

const port = new SerialPort({ path: SERIAL_PORT, baudRate: Number(BAUD) });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
port.on('open',  () => console.log(`[Bridge] Serial abierto ${SERIAL_PORT} @ ${BAUD}`));
port.on('error', (e) => console.error('[Serial error]', e.message));

const sens = Number(SENSITIVITY) || 80;
const targetHz = Math.max(5, Math.min(120, Number(SAMPLE_HZ) || 40));
const minSendInterval = Math.floor(1000 / targetHz);

let ema = 512;           // promedio móvil exponencial (ruido)
let emaAlpha = 0.02;
let lastSent = 0;
let lastClapAt = 0;
const clapCooldownMs = 180;

parser.on('data', async (lineRaw) => {
  const line = String(lineRaw).trim();
  const val = Number(line);
  if (!Number.isFinite(val)) return;

  const level = Math.max(0, Math.min(1023, val));
  ema = ema + emaAlpha * (level - ema);
  const above = level - ema;

  const norm = Math.max(0, Math.min(1, above / Math.max(20, sens)));

  const now = Date.now();
  const clap = above >= sens && (now - lastClapAt) > clapCooldownMs;
  if (clap) lastClapAt = now;

  if (now - lastSent < minSendInterval) return;
  lastSent = now;

  try {
    await channel.send({ type: 'broadcast', event: 'sensor', payload: { level, norm, clap } });
    // console.log({ level, norm: +norm.toFixed(2), clap });
  } catch (e) {
    console.error('[Supabase send error]', e.message);
  }
});

const shutdown = async () => {
  try { await channel.unsubscribe(); } catch {}
  try { await sb.removeAllChannels(); } catch {}
  try { await port.close(); } catch {}
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
