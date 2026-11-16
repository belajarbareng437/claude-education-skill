#!/usr/bin/env node
// Generator SFX: semua suara disintesis dari nol (noise + sinus), jadi 100% bebas lisensi.
// Pakai:  node tools/sfx/gen-sfx.mjs            -> tulis semua ke sfx/
//         node tools/sfx/gen-sfx.mjs pop ding   -> hanya yang disebut
//         node tools/sfx/gen-sfx.mjs --out folder-lain
// Output: WAV 48 kHz, 16-bit, stereo, puncak -3 dBFS. Hasil selalu sama (seed tetap).

import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const PEAK_DB = -3;

// ---------- utilitas ----------
function rng(seed) {
  // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const noiseGen = (seed) => { const r = rng(seed); return () => r() * 2 - 1; };
const expLerp = (a, b, x) => a * Math.pow(b / a, x);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// SVF topologi-TPT (stabil walau cutoff berubah tiap sampel)
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, fc, q) => {
    const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return { low: v2, band: v1, high: x - k * v1 - v2 };
  };
}

// Membuat buffer stereo dari fungsi per-sampel yang mengembalikan [L, R] atau angka (mono)
function render(dur, fn) {
  const n = Math.round(dur * SR);
  const L = new Float64Array(n), R = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const out = fn(i / SR, i / n, i);
    if (typeof out === "number") { L[i] = out; R[i] = out; }
    else { L[i] = out[0]; R[i] = out[1]; }
  }
  return { L, R };
}
const pan = (s, p) => { // p: -1 kiri .. +1 kanan, equal-power
  const a = (p + 1) * Math.PI / 4;
  return [s * Math.cos(a), s * Math.sin(a)];
};
function reverse(buf) { return { L: buf.L.slice().reverse(), R: buf.R.slice().reverse() }; }

// Bunyi lonceng: jumlah parsial sinus dengan peluruhan eksponensial
function bell(t, f0, partials) {
  let s = 0;
  for (const [ratio, amp, tau] of partials) s += amp * Math.sin(2 * Math.PI * f0 * ratio * t) * Math.exp(-t / tau);
  return s;
}

// ---------- definisi suara ----------
const SOUNDS = {
  // Kartu/teks masuk: noise naik dari gelap ke terang, bergerak kiri -> kanan
  "whoosh-in": () => {
    const nz = noiseGen(11), f = svf();
    return render(0.45, (t, x) => {
      const fc = expLerp(250, 3200, x);
      const env = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.75)), 2);
      return pan(f(nz(), fc, 1.2).band * env, -0.6 + 1.0 * x);
    });
  },
  // Keluar: kebalikan whoosh-in
  "whoosh-out": () => reverse(SOUNDS["whoosh-in"]()),

  // Ganti poin: sapuan cepat dan lebih tajam
  "swoosh-fast": () => {
    const nz = noiseGen(23), f = svf();
    return render(0.22, (t, x) => {
      const fc = expLerp(700, 6500, x);
      const env = Math.pow(Math.sin(Math.PI * x), 1.5);
      return pan(f(nz(), fc, 2.5).band * env, 0.5 - 1.0 * x);
    });
  },

  // Nomor berubah: nada meluncur naik dengan vibrato halus + napas noise
  "morph": () => {
    const nz = noiseGen(31), f = svf();
    let ph1 = 0, ph2 = 0;
    return render(0.35, (t, x) => {
      const fr = expLerp(480, 880, x) * (1 + 0.01 * Math.sin(2 * Math.PI * 18 * t));
      ph1 += 2 * Math.PI * fr / SR; ph2 += 2 * Math.PI * fr * 1.5 / SR;
      const env = clamp01(t / 0.04) * Math.exp(-Math.max(0, t - 0.04) / 0.12);
      const tone = 0.7 * Math.sin(ph1) + 0.25 * Math.sin(ph2) * x;
      const air = f(nz(), expLerp(1500, 5000, x), 1.5).band * 0.35;
      return (tone + air) * env;
    });
  },

  // B-roll muncul: nada jatuh cepat + klik kecil
  "pop": () => {
    const nz = noiseGen(41);
    let ph = 0;
    return render(0.13, (t) => {
      ph += 2 * Math.PI * (200 + 800 * Math.exp(-t / 0.012)) / SR;
      const body = Math.sin(ph) * Math.exp(-t / 0.028);
      const click = t < 0.003 ? nz() * (1 - t / 0.003) * 0.5 : 0;
      return body + click;
    });
  },

  // Tag/pill: kicauan gelembung naik
  "bubble": () => {
    let ph = 0;
    return render(0.16, (t) => {
      ph += 2 * Math.PI * expLerp(320, 1250, clamp01(t / 0.07)) / SR;
      const env = clamp01(t / 0.004) * Math.exp(-t / 0.045);
      return Math.sin(ph) * env;
    });
  },

  // Tombol/UI: klik pendek dan kering
  "click": () => {
    const nz = noiseGen(53), f = svf();
    return render(0.05, (t) => {
      const n = f(nz(), 2500, 0.8).high * Math.exp(-t / 0.0025);
      const tone = Math.sin(2 * Math.PI * 3100 * t) * Math.exp(-t / 0.008) * 0.6;
      return n + tone;
    });
  },

  // Checklist/ketik: tik halus
  "tick": () => {
    const nz = noiseGen(61);
    return render(0.04, (t) => {
      const tone = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t / 0.006);
      const n = t < 0.0015 ? nz() * 0.4 : 0;
      return tone + n;
    });
  },

  // Kartu poin baru: dua nada lonceng (E6 lalu B6)
  "notif": () => render(0.7, (t) => {
    const P = [[1, 1, 0.25], [2.0, 0.35, 0.12], [3.01, 0.12, 0.06]];
    const a = bell(t, 1318.5, P);
    const t2 = t - 0.11;
    const b = t2 > 0 ? bell(t2, 1975.5, P) : 0;
    return 0.5 * a + 0.5 * b;
  }),

  // Konfirmasi ✓: satu lonceng jernih (C6)
  "ding": () => render(1.0, (t) => {
    const env = clamp01(t / 0.002);
    return env * bell(t, 1046.5, [[1, 1, 0.38], [2.0, 0.4, 0.22], [3.01, 0.18, 0.12], [4.2, 0.07, 0.07]]);
  }),

  // Hook/CTA: naik tegang, lalu disambung "impact"
  "riser": () => {
    const nz = noiseGen(71), f = svf();
    let ph = 0;
    return render(1.5, (t, x) => {
      const n = f(nz(), expLerp(200, 8000, x), 1.8).band;
      const fr = expLerp(110, 440, x);
      ph += 2 * Math.PI * fr / SR;
      const tone = (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.33 * Math.sin(3 * ph)) * 0.35;
      const env = Math.pow(x, 1.6) * clamp01((1 - x) / 0.02); // tutup cepat di 2% terakhir
      const wob = 1 + 0.15 * Math.sin(2 * Math.PI * expLerp(3, 14, x) * t);
      const s = (n * 0.9 + tone) * env * wob;
      return pan(s, 0.35 * Math.sin(2 * Math.PI * 1.2 * t));
    });
  },

  // Hentakan: sub bass jatuh + noise berat, sedikit saturasi
  "impact": () => {
    const nz = noiseGen(83), f = svf();
    let ph = 0;
    return render(1.0, (t) => {
      ph += 2 * Math.PI * (40 + 90 * Math.exp(-t / 0.04)) / SR;
      const sub = Math.sin(ph) * Math.exp(-t / 0.28);
      const crack = f(nz(), 1400, 0.7).low * Math.exp(-t / 0.07) * 1.2;
      return Math.tanh(1.6 * (sub + crack)) / Math.tanh(1.6);
    });
  },
};

// ---------- akhir: fade, normalisasi, tulis WAV ----------
function finish(buf) {
  const n = buf.L.length, fade = Math.round(0.002 * SR);
  for (let i = 0; i < fade && i < n; i++) {
    const g = i / fade;
    buf.L[n - 1 - i] *= g; buf.R[n - 1 - i] *= g;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf.L[i]), Math.abs(buf.R[i]));
  if (!Number.isFinite(peak) || peak === 0) throw new Error("buffer kosong atau NaN");
  const gain = Math.pow(10, PEAK_DB / 20) / peak;
  for (let i = 0; i < n; i++) { buf.L[i] *= gain; buf.R[i] *= gain; }
  return buf;
}

function wav(buf) {
  const n = buf.L.length, ch = 2, bytes = n * ch * 2;
  const b = Buffer.alloc(44 + bytes);
  b.write("RIFF", 0); b.writeUInt32LE(36 + bytes, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * ch * 2, 28); b.writeUInt16LE(ch * 2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(bytes, 40);
  let o = 44;
  const q = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  for (let i = 0; i < n; i++) { b.writeInt16LE(q(buf.L[i]), o); b.writeInt16LE(q(buf.R[i]), o + 2); o += 4; }
  return b;
}

// ---------- CLI ----------
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let outDir = here;  // default: folder ini (engine/sfx)
const oi = args.indexOf("--out");
if (oi >= 0) { outDir = resolve(args[oi + 1]); args.splice(oi, 2); }
const names = args.length ? args : Object.keys(SOUNDS);
const unknown = names.filter((n) => !SOUNDS[n]);
if (unknown.length) {
  console.error(`Tidak dikenal: ${unknown.join(", ")}\nTersedia: ${Object.keys(SOUNDS).join(", ")}`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
for (const name of names) {
  const buf = finish(SOUNDS[name]());
  const file = join(outDir, `${name}.wav`);
  writeFileSync(file, wav(buf));
  console.log(`${name.padEnd(12)} ${(buf.L.length / SR).toFixed(2)} s  -> ${file}`);
}
