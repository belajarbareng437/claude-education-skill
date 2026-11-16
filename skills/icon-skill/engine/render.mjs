#!/usr/bin/env node
// Mesin render icon-skill (gaya cyan). Satu folder proyek berisi edit.json -> MP4 1080x1920.
//
//   node <SKILL_DIR>/engine/render.mjs <proyek>                    render penuh -> <proyek>/out/<nama>-v1.mp4
//   node <SKILL_DIR>/engine/render.mjs <proyek> --stills 0.5,7,20  hanya gambar diam -> <proyek>/shots/
//   node <SKILL_DIR>/engine/render.mjs <proyek> --version 2        nama keluaran -v2
//   node <SKILL_DIR>/engine/render.mjs <proyek> --from 10 --to 15  sebagian saja (cek cepat)
//
// Butuh: Node 22+, ffmpeg, Google Chrome (atau env CHROME_PATH), Python 3 + opencv-python (pelacak dagu).
// Python diambil dari env PYTHON, lalu python3/python di PATH.
// Tahap: potong footage (frames + suara, di-cache) -> lacak dagu -> rencana waktu -> Chrome merekam
// tiap frame -> mix SFX -> encode.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const SFX_DIR = join(TOOLS, "sfx");

// ---------- argumen ----------
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const projDir = resolve(argv.find((a) => !a.startsWith("--") && !/^[\d.,]+$/.test(a)) || ".");
const cfg = JSON.parse(readFileSync(join(projDir, "edit.json"), "utf8"));
const FPS = cfg.fps || 30;
const [W, H] = cfg.size || [1080, 1920];
const stills = opt("--stills") ? opt("--stills").split(",").map(Number) : null;
const version = opt("--version", "1");
const build = join(projDir, "build");
mkdirSync(build, { recursive: true });

// ---------- alat ----------
function findExe(name, globs) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8" });
  if (r.status === 0) return r.stdout.split(/\r?\n/)[0].trim();
  for (const p of globs) if (p && existsSync(p)) return p;
  throw new Error(`${name} tidak ditemukan`);
}
function wingetFfmpeg(exe) {
  const pk = join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages");
  if (!existsSync(pk)) return null;
  for (const d of readdirSync(pk).filter((d) => d.startsWith("Gyan.FFmpeg"))) {
    for (const s of readdirSync(join(pk, d))) {
      const p = join(pk, d, s, "bin", exe);
      if (existsSync(p)) return p;
    }
  }
  return null;
}
const FFMPEG = findExe("ffmpeg", [wingetFfmpeg("ffmpeg.exe")]);
const CHROME = process.env.CHROME_PATH || findExe(process.platform === "darwin" ? "google-chrome" : "chrome", [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"]);

function ff(args, label) {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg (${label}) gagal:\n${r.stderr.slice(-1500)}`);
}

// ---------- 1. potong footage ----------
// cfg.tail: detik tambahan di ujung (frame terakhir dibekukan + hening), untuk CTA penutup.
// cfg.grade: filter warna ffmpeg yang dipasang ke footage (opsional).
const TAIL = cfg.tail || 0;
const GRADE = cfg.grade || "";
// cfg.cuts: [[a,b], ...] rentang detik sumber yang dibuang (jeda di dalam segmen). Segmen dipecah jadi
// sub-segmen (jump cut); poin tetap merujuk indeks segmen asli lewat `groups`.
const CUTS = (cfg.cuts || []).slice().sort((p, q) => p[0] - q[0]);
const pieces = [];
cfg.segments.forEach(([s, e], k) => {
  let a = s;
  for (const [c0, c1] of CUTS) if (c0 > a && c1 < e) { pieces.push([a, c0, k]); a = c1; }
  pieces.push([a, e, k]);
});
const segs = pieces.map(([s, e, grp], k) => {
  const ext = k === pieces.length - 1 ? TAIL : 0;
  const n = Math.round((e - s + ext) * FPS);
  return { s, e: s + n / FPS, n, ext, grp };
});
let off = 0;
for (const g of segs) { g.o = off; off += g.n / FPS; }
const groups = cfg.segments.map((_, k) => {
  const gs = segs.filter((g) => g.grp === k);
  return { o: gs[0].o, n: gs.reduce((t, g) => t + g.n, 0) };
});
const src = resolve(projDir, cfg.source);
const cutKey = createHash("sha1").update(JSON.stringify({ src, segs, FPS, W, H, GRADE, TAIL })).digest("hex").slice(0, 12);
const framesDir = join(build, "frames");
const keyFile = join(build, "cut.key");
if (!existsSync(keyFile) || readFileSync(keyFile, "utf8") !== cutKey) {
  console.log(`potong ${segs.length} segmen dari ${cfg.source} ...`);
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  const parts = [], cat = [];
  segs.forEach((g, k) => {
    const d = g.n / FPS;
    parts.push(`[0:v]trim=start=${g.s}:duration=${d},setpts=PTS-STARTPTS,fps=${FPS},` +
      `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},setsar=1` +
      `${GRADE ? "," + GRADE : ""}${g.ext ? `,tpad=stop_mode=clone:stop_duration=${g.ext}` : ""},trim=end_frame=${g.n}[v${k}]`);
    parts.push(`[0:a]atrim=start=${g.s}:duration=${d},asetpts=PTS-STARTPTS,aresample=48000,` +
      `afade=t=in:d=0.02,afade=t=out:st=${(d - g.ext - 0.03).toFixed(3)}:d=0.03` +
      `${g.ext ? `,apad=pad_dur=${g.ext},atrim=duration=${d.toFixed(4)}` : ""}[a${k}]`);
    cat.push(`[v${k}][a${k}]`);
  });
  const fc = parts.join(";") + `;${cat.join("")}concat=n=${segs.length}:v=1:a=1[v][a]`;
  ff(["-i", src, "-filter_complex", fc, "-map", "[v]", "-q:v", "2", join(framesDir, "%05d.jpg"),
      "-map", "[a]", "-ac", "2", join(build, "speech.wav")], "potong");
  writeFileSync(keyFile, cutKey);
}
const N = readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).length;
const DUR = N / FPS;
console.log(`${N} frame, ${DUR.toFixed(2)} s`);

// ---------- 1b. lacak dagu (subtitle tepat di bawah dagu) ----------
const chinFile = join(build, "chin.json"), chinKey = join(build, "chin.key");
if (!existsSync(chinFile) || !existsSync(chinKey) || readFileSync(chinKey, "utf8") !== cutKey) {
  console.log("lacak wajah/dagu ...");
  const py = process.env.PYTHON || (() => {
    for (const n of process.platform === "win32" ? ["python", "py"] : ["python3", "python"]) {
      try { return findExe(n, []); } catch {}
    }
    throw new Error("Python tidak ditemukan (set env PYTHON ke python yang punya opencv-python)");
  })();
  const r = spawnSync(py, [join(TOOLS, "chin.py"), framesDir, chinFile], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("chin.py gagal");
  writeFileSync(chinKey, cutKey);
}
function smoothChin(raw) {
  const out = new Array(raw.length);
  let a = 0;
  for (const g of segs) {                         // haluskan per segmen: di jump cut posisi boleh melompat
    const b = a + g.n, v = raw.slice(a, b);
    const known = v.map((y, i) => [i, y]).filter(([, y]) => y != null);
    const fallback = known.length ? known[Math.floor(known.length / 2)][1] : H * 0.48;
    let x = v.map((y, i) => y ?? (known.reduce((best, k) => Math.abs(k[0] - i) < Math.abs(best[0] - i) ? k : best, [Infinity, fallback])[1]));
    const med = (arr, i, r) => { const w = arr.slice(Math.max(0, i - r), i + r + 1).sort((p, q) => p - q); return w[w.length >> 1]; };
    const m = x.map((_, i) => med(x, i, 15));
    x = x.map((y, i) => Math.abs(y - m[i]) > 70 ? m[i] : y);   // buang lonjakan (deteksi salah)
    const sig = 9, R = 27;                                      // Gaussian ~0.3 s: tenang tapi tetap mengikuti
    const k = Array.from({ length: 2 * R + 1 }, (_, j) => Math.exp(-((j - R) ** 2) / (2 * sig * sig)));
    for (let i = 0; i < x.length; i++) {
      let s = 0, ws = 0;
      for (let j = -R; j <= R; j++) { const q = i + j; if (q < 0 || q >= x.length) continue; s += x[q] * k[j + R]; ws += k[j + R]; }
      out[a + i] = s / ws;
    }
    a = b;
  }
  return out;
}
const chinRaw = JSON.parse(readFileSync(chinFile, "utf8"));
// cfg.chinRange: [min, max] px; deteksi dagu di luar rentang ini dianggap salah dan diisi dari tetangga.
if (cfg.chinRange) {
  const [lo, hi] = cfg.chinRange;
  chinRaw.chin = chinRaw.chin.map((y) => (y != null && (y < lo || y > hi) ? null : y));
}
const chin = smoothChin(chinRaw.chin);

// ---------- 2. rencana waktu ----------
const wj = JSON.parse(readFileSync(resolve(projDir, cfg.words), "utf8"));
const words = wj.words.map((w, i) => ({ ...w, ...(cfg.wordFix?.[i] || {}) }));
function map(t) {
  for (const g of segs) if (t >= g.s - 0.25 && t <= g.e + 0.05) return g.o + Math.min(Math.max(t, g.s), g.e) - g.s;
  return null;
}
const OW = words.map((w, i) => {
  const s = map(w.start), e = map(w.end);
  if (s == null) { console.warn(`  kata #${i} "${w.word}" (${w.start}s) di luar potongan, dilewati`); return null; }
  return { i, text: w.word, start: s, end: e ?? s + 0.3 };
});
const Wd = (i) => { if (!OW[i]) throw new Error(`kata #${i} tidak ada di hasil potong`); return OW[i]; };

// Gaya "cyan" (ref1-bicara-ke-kamera-2): caption kinetik kecil-putih + kata kunci besar cyan di bawah dagu,
// cutaway layar hitam berobjek untuk sebagian kalimat "kuat", punch-in zoom, rekap pill putih ber-ikon + CTA.
function buildCyan() {
  const sfx = [];
  const S = (name, t, vol) => { if (t >= 0 && t < DUR) sfx.push({ name, t: +t.toFixed(3), vol }); };
  const faceAt = (g) => {
    const a = Math.round(g.o * FPS), f = chinRaw.face.slice(a, a + g.n).filter(Boolean);
    if (!f.length) return [W / 2, H * 0.3];
    const med = (v) => v.sort((p, q) => p - q)[v.length >> 1];
    return [Math.round(med(f.map((b) => b[0] + b[2] / 2))), Math.round(med(f.map((b) => b[1] + b[3] / 2)))];
  };
  const points = cfg.points.map((p, k) => {
    const g = groups[p.seg];
    const start = g.o, end = g.o + g.n / FPS, kuatAt = Wd(p.kuat).start - 0.05;
    return {
      n: k + 1, start, end, kuatAt, face: faceAt(g), base: k % 2 ? 1.07 : 1.0,
      weak: { small: p.weak.small, big: p.weak.big, at: Math.max(start + 0.25, Wd(p.weak.w).start) },
      strong: { small: p.strong.small, big: p.strong.big, at: Math.max(kuatAt + 0.25, Wd(p.strong.w).start),
                icon: p.strong.icon, cut: !!p.strong.cut },
    };
  });
  const hook = { ...cfg.hook, end: Wd(cfg.hook.toWord).end + 0.15 };
  const recap = { ...cfg.recap, start: Wd(cfg.recap.afterWord).end + 0.1, step: cfg.recap.step ?? 0.2 };

  S("impact", 0.0, 0.35); S("whoosh-in", 0.02, 0.26); S("whoosh-out", hook.end, 0.18);
  points.forEach((p, k) => {
    if (k > 0) S("swoosh-fast", p.start, 0.22);
    S("pop", p.weak.at, 0.22);
    if (p.strong.cut) { S("whoosh-in", p.kuatAt - 0.05, 0.28); S("morph", p.strong.at, 0.2); }
    else { S("pop", p.strong.at, 0.3); S("bubble", p.strong.at + 0.12, 0.22); }
  });
  S("whoosh-in", recap.start, 0.24);
  recap.items.forEach((_, i) => S("bubble", recap.start + 0.25 + i * recap.step, 0.24));
  S("ding", recap.start + 0.25 + recap.items.length * recap.step + 0.2, 0.24);

  return { style: "cyan", fps: FPS, frames: N, duration: DUR, W, H, hook, points, recap, cta: cfg.cta,
           chin: chin.map((y) => Math.round(y)), sfx };
}

if (cfg.style && cfg.style !== "cyan") throw new Error(`style "${cfg.style}" tidak didukung mesin ini (hanya "cyan")`);
const plan = buildCyan();
const sfx = plan.sfx;

// ---------- 2b. potong frame B-roll (di-cache per klip) ----------
const [BW, BH] = cfg.brollSize || [820, 1000];
plan.brollSize = [BW, BH];
for (const b of plan.brolls || []) {
  const dir = join(build, "broll", String(b.k));
  const n = Math.ceil((b.end - b.start + 0.6) * FPS);
  const file = resolve(projDir, b.file);
  const key = JSON.stringify({ file, from: b.from, n, BW, BH, FPS, loop: !!b.loop });
  const kf = join(build, "broll", `${b.k}.key`);
  if (!existsSync(kf) || readFileSync(kf, "utf8") !== key) {
    console.log(`B-roll ${b.k}: ${b.file} (${(n / FPS).toFixed(1)} s dari ${b.from} s) ...`);
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    // b.loop: klip pendek (mis. ikon animasi 2 s) diputar berulang sampai durasi B-roll terpenuhi
    ff([...(b.loop ? ["-stream_loop", "-1"] : []), "-ss", String(b.from), "-i", file, "-an", "-frames:v", String(n), "-vf",
        `fps=${FPS},scale=${BW}:${BH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${BW}:${BH},setsar=1`,
        "-q:v", "2", join(dir, "%05d.jpg")], `broll ${b.k}`);
    writeFileSync(kf, key);
  }
  b.frames = readdirSync(dir).filter((f) => f.endsWith(".jpg")).length;
  if (b.frames < n) console.warn(`  B-roll ${b.k} hanya ${(b.frames / FPS).toFixed(1)} s, frame terakhir ditahan`);
}
writeFileSync(join(build, "plan.json"), JSON.stringify(plan, null, 1));

// ---------- 3. halaman ----------
const fontUrl = pathToFileURL(join(TOOLS, "fonts", "Inter.ttf")).href;
const html = readFileSync(join(TOOLS, "stage-cyan.html"), "utf8")
  .replace("__FONT__", fontUrl)
  .replace("__FONTB__", pathToFileURL(join(TOOLS, "fonts", "Metropolis-Black.otf")).href)
  .replace("/*PLAN*/null", JSON.stringify(plan));
writeFileSync(join(build, "stage.html"), html);

// ---------- 4. Chrome (CDP) ----------
async function openChrome() {
  const prof = mkdtempSync(join(tmpdir(), "stage-chrome-"));
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${prof}`,
    "--hide-scrollbars", "--allow-file-access-from-files", "--force-device-scale-factor=1",
    "--no-first-run", "--no-default-browser-check", "--mute-audio", "about:blank"], { stdio: "ignore" });
  const portFile = join(prof, "DevToolsActivePort");
  for (let i = 0; i < 200 && !existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 100));
  const port = readFileSync(portFile, "utf8").split("\n")[0].trim();
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const wait = new Map(); const evs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && wait.has(d.id)) { const { ok, no } = wait.get(d.id); wait.delete(d.id); d.error ? no(new Error(JSON.stringify(d.error))) : ok(d.result); }
    else if (d.method) evs.forEach((f) => f(d));
  };
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; wait.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = (method) => new Promise((r) => { const f = (d) => { if (d.method === method) { evs.splice(evs.indexOf(f), 1); r(d); } }; evs.push(f); });
  const close = () => { try { ws.close(); } catch {} proc.kill(); setTimeout(() => rmSync(prof, { recursive: true, force: true }), 500); };
  return { send, once, close };
}
async function evalJS(c, expr) {
  const r = await c.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

const c = await openChrome();
try {
  await c.send("Page.enable");
  await c.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const loaded = c.once("Page.loadEventFired");
  await c.send("Page.navigate", { url: pathToFileURL(join(build, "stage.html")).href });
  await loaded;
  if (!(await evalJS(c, "window.ready"))) console.warn("PERINGATAN: font Inter belum termuat, pakai cadangan");
  const shot = async (i, quality = 92) => {
    await evalJS(c, `window.renderFrame(${i})`);
    return Buffer.from((await c.send("Page.captureScreenshot", { format: "jpeg", quality, optimizeForSpeed: true })).data, "base64");
  };

  if (stills) {
    const dir = join(projDir, "shots"); mkdirSync(dir, { recursive: true });
    for (const t of stills) {
      const i = Math.min(N - 1, Math.max(0, Math.round(t * FPS)));
      const f = join(dir, `t${t.toFixed(2).padStart(5, "0")}.jpg`);
      writeFileSync(f, await shot(i)); console.log(f);
    }
  } else {
    // ---------- 5. mix suara ----------
    const from = Math.max(0, Math.round(Number(opt("--from", 0)) * FPS));
    const to = Math.min(N, Math.round(Number(opt("--to", DUR)) * FPS));
    const partial = from > 0 || to < N;
    const a0 = from / FPS, aDur = (to - from) / FPS;
    const ins = ["-i", join(build, "speech.wav")];
    const fx = [`[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[sp]`];
    const used = sfx.filter((s) => s.t + 2 > a0 && s.t < a0 + aDur);
    used.forEach((s, k) => {
      ins.push("-i", join(SFX_DIR, `${s.name}.wav`));
      fx.push(`[${k + 1}:a]aresample=48000,volume=${s.vol},adelay=delays=${Math.round(s.t * 1000)}:all=1[s${k}]`);
    });
    const mixIn = ["[sp]", ...used.map((_, k) => `[s${k}]`)].join("");
    fx.push(`${mixIn}amix=inputs=${used.length + 1}:normalize=0:duration=first,alimiter=limit=0.95,` +
      `atrim=start=${a0}:duration=${aDur},asetpts=PTS-STARTPTS[out]`);
    const mix = join(build, "mix.wav");
    ff([...ins, "-filter_complex", fx.join(";"), "-map", "[out]", "-ac", "2", mix], "mix");

    // ---------- 6. rekam + encode (frame dialirkan langsung ke ffmpeg) ----------
    const outDir = join(projDir, "out"); mkdirSync(outDir, { recursive: true });
    const out = join(outDir, `${cfg.name}-v${version}${partial ? `-part${(a0).toFixed(0)}-${(a0 + aDur).toFixed(0)}` : ""}.mp4`);
    const enc = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y",
      "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-i", mix,
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise((r, j) => enc.on("close", (code) => code === 0 ? r() : j(new Error(`encode gagal (${code})`))));
    const t0 = Date.now();
    for (let i = from; i < to; i++) {
      const buf = await shot(i);
      if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r));
      if ((i - from) % 60 === 0) {
        const el = (Date.now() - t0) / 1000, k = i - from + 1;
        process.stdout.write(`\r  frame ${k}/${to - from}  ${(k / el).toFixed(1)} fps  ~${Math.max(0, ((to - from - k) / (k / el))).toFixed(0)} s lagi   `);
      }
    }
    enc.stdin.end(); await done;
    console.log(`\nselesai dalam ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${out}`);
  }
} finally { c.close(); }
