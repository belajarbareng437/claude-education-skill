---
name: icon-skill
description: Edit video orang bicara ke kamera (vertikal 1080x1920, bahasa Indonesia) dengan gaya "cyan" ber-ikon — teks kinetik dua ukuran (kata kecil putih + kata kunci besar tebal bergradasi cyan di bawah dagu), kotak ikon emoji 3D, cutaway layar hitam dengan ikon raksasa, punch-in zoom ke wajah, rekap pill putih ber-ikon, dan CTA "Follow aku", dengan SFX otomatis. Paling cocok untuk konten perbandingan per poin ("X lemah vs X kuat", salah vs benar, dulu vs sekarang). Dirender dengan mesin bawaan (Node + Chrome headless + ffmpeg) dari edit.json berisi "style": "cyan". Pakai saat user minta edit video "gaya cyan", "gaya ikon", "icon-skill", "lemah vs kuat", atau merevisi proyek yang edit.json-nya "style": "cyan".
argument-hint: "<video> [topik/catatan] | cek alat | revisi <proyek>"
---

# Edit video gaya cyan (icon-skill)

User berbahasa Indonesia; balas dalam bahasa Indonesia, singkat dan mudah dipahami.

`SKILL_DIR` = folder skill ini (baris "Base directory for this skill" saat skill dimuat). Semua mesin ada di
dalamnya; jangan menulis hasil kerja ke `SKILL_DIR` — buat folder proyek terpisah.

## Saat dipanggil dengan `/icon-skill`

Argumen dari user: `$ARGUMENTS`

| Argumen | Yang dilakukan |
|---|---|
| kosong | Jelaskan 1 kalimat gaya ini, lalu tanya: path video dan topik/poin perbandingannya. |
| `cek alat` / `doctor` | Jalankan `python SKILL_DIR/scripts/doctor.py`, laporkan yang kurang beserta perintah pasangnya. Berhenti. |
| path video (+ topik) | Jalankan **Alur kerja** di bawah. |
| `revisi <proyek>` atau teks lain | Ubah `edit.json` proyek yang ada, cek gambar diam, render versi baru. |

## Ciri gaya (yang ditiru)

1. **Teks kinetik dua ukuran.** Baris atas kecil, putih, semi-bold (Inter 600, ±50px). Baris bawah satu kata
   kunci besar sangat tebal (Metropolis Black 900, ±150px) dengan gradasi cyan vertikal
   `#8AF0FF → #2FD3F7 → #0FA6DE` (`--cy: #22C9F4`). Letaknya di area dada, tepat di bawah dagu (dilacak otomatis).
   Kata kecil menyala satu per satu (redup 40% → terang), kata besar "pop" (scale 0.55 → overshoot → 1, blur hilang)
   tepat saat diucapkan.
2. **Pola lemah vs kuat.** Tiap poin dua kalimat: kalimat "lemah" → kata kunci besar **putih**; kalimat "kuat" →
   kata kunci besar **cyan** + kotak ikon putih membulat (emoji 3D) di sebelah kanan.
3. **Cutaway layar hitam.** Untuk sebagian kalimat "kuat": hard cut ke latar hitam radial dengan debu halus,
   satu ikon raksasa (±400px) di tengah yang mengayun pelan, caption di bawahnya.
   Selang-seling dengan poin yang tetap di wajah supaya ritme tidak monoton (contoh: poin 1, 3, 5 cutaway).
4. **Punch-in zoom.** Poin genap mulai dari zoom 1.07; saat masuk kalimat "kuat" (yang tidak cutaway) zoom naik
   +0.13 dalam 0.12 detik, berpusat di wajah.
5. **Hook pembuka.** Di atas kepala: kecil (kiri) / besar cyan / kecil (kanan), dengan scrim gelap di atas frame.
6. **Rekap + CTA.** Latar diburamkan dan digelapkan, judul cyan, grid 2 kolom pill putih ber-ikon yang muncul
   satu per satu (jeda 0.2 s), lalu CTA kecil putih + besar cyan.
7. **Ritme cepat.** Video pendek (±30 detik), potongan rapat tanpa jeda. SFX otomatis: impact + whoosh di hook,
   swoosh-fast antar poin, pop saat kata besar muncul, bubble saat ikon/pill muncul, whoosh-in + morph saat
   cutaway, ding di akhir rekap.

## Isi skill

| File | Fungsi |
|---|---|
| `engine/render.mjs` | Mesin render: potong footage, lacak dagu, susun waktu (`buildCyan()`), rekam tiap frame di Chrome headless, mix SFX, encode. |
| `engine/stage-cyan.html` | Semua grafis (CSS + animasi per frame). Ubah di sini untuk mengubah tampilan. |
| `engine/chin.py` | Pelacak wajah/dagu (OpenCV Haar). |
| `engine/fonts/` | Inter + Metropolis Black (SIL OFL). |
| `engine/sfx/` | SFX sintetis bebas lisensi; buat ulang dengan `node engine/sfx/gen-sfx.mjs`. |
| `scripts/transcribe.py` | faster-whisper → `<nama>.words.json` (timestamp per kata, field `word`). |
| `scripts/timeline.py` | Peta indeks kata → waktu sumber/hasil untuk sebuah proyek. |
| `scripts/doctor.py` | Cek Node, ffmpeg, Chrome, Python + opencv-python + faster-whisper. |
| `references/contoh-edit.json` | Contoh `edit.json` lengkap (6 poin "brand lemah vs brand kuat", ±32 detik). Titik awal terbaik. |

Persyaratan: Node.js 22+, ffmpeg, Google Chrome, Python 3.10+ dengan `pip install opencv-python faster-whisper`.
Perintah Python: `python` di Windows, `python3` di macOS. Bila Python yang punya opencv bukan yang di PATH,
set env `PYTHON` ke path-nya sebelum `render.mjs`. Bila Chrome tidak ketemu, set env `CHROME_PATH`.

## Alur kerja video baru

Buat folder proyek, mis. `<folder kerja>/<nama>/`. Di bawah, `P` = folder proyek itu.

### 1. Cek video
`ffprobe` resolusi, fps, rotasi. Ambil beberapa frame untuk melihat posisi wajah/dagu.

### 2. Transkrip
`python -I SKILL_DIR/scripts/transcribe.py "<video>" --out P/work` → `P/work/<nama>.words.json`.
Model bawaan `large-v3-turbo` (akurat, lambat di CPU); untuk cepat pakai `--model small`.
Cetak kata beserta indeks dan waktunya.

### 3. Pilih isi, lalu tunggu persetujuan user
Gaya ini butuh struktur **perbandingan per poin** (lemah vs kuat, salah vs benar, dulu vs sekarang).
- Pilih take terbaik tiap poin → `segments` (detik sumber, satu segment = satu poin). Potong di lembah energi audio,
  bukan di tengah suku kata. Buang take ulang, pengisi, halusinasi Whisper ("Terima kasih telah menonton").
- Tulis tabel usulan: poin, kalimat lemah → kata besar putih, kalimat kuat → kata besar cyan + ikon,
  mana yang cutaway, perkiraan durasi. Kata kunci diambil dari ucapan, bukan dikarang.
- Tanyakan hanya yang perlu (ejaan, teks CTA bila belum ada). Nama akun/channel jangan dikarang.

### 4. Tulis `P/edit.json`
Salin `references/contoh-edit.json`, lalu ubah. Field penting:

| Field | Isi |
|---|---|
| `"style": "cyan"` | wajib |
| `name` | nama keluaran (`out/<name>-v<N>.mp4`) |
| `source`, `words` | path video mentah dan words.json — relatif dari `P` atau absolut |
| `segments` | `[[mulai, akhir], ...]` detik sumber; indeksnya dipakai `points[].seg` |
| `cuts` | opsional `[[a, b], ...]` detik sumber yang dibuang di dalam segment (jump cut) |
| `tail` | detik ekor setelah segment terakhir untuk rekap + CTA (±2.6) |
| `grade` | filter ffmpeg warna (boleh disalin dari contoh) |
| `hook` | `small1`, `big` (≤ ±12 karakter), `small2`, `toWord` = indeks kata akhir hook |
| `points[]` | `seg`, `kuat` = indeks kata pertama kalimat "kuat"; `weak` {small, big, w}; `strong` {small, big, w, icon, cut} |
| `recap` | `afterWord` (indeks kata), `step`, `title`, `items[]` {icon, text} (6 item pas untuk grid 2×3) |
| `cta` | `small`, `big` |
| `wordFix` | opsional `{ "<indeks>": { "word": "...", "start": .. } }` memperbaiki kata/waktu whisper |
| `chinRange` | opsional `[min, max]` px; deteksi dagu di luar rentang dianggap salah |

`w` = indeks kata yang memicu kata besar muncul. `big` sebaiknya ≤ ±16 karakter; lebih panjang otomatis mengecil.
`cut: true` = kalimat kuat jadi cutaway hitam dengan `icon` raksasa.
Peta indeks kata: `python -I SKILL_DIR/scripts/timeline.py P`.

### 5. Cek gambar diam
```
node SKILL_DIR/engine/render.mjs P --stills 1.2,2.5,4.6,5.4,9.5,12.5,15.5,19.5,24,31.6
```
Hasil di `P/shots/`. Gabung jadi satu lembar kontak (ffmpeg `hstack`/`vstack`; jangan pakai
`-pattern_type glob`, tidak jalan di Windows) lalu lihat gambarnya. Pilih waktu yang menguji: hook, tiap kata besar
tepat setelah muncul, tiap cutaway, rekap, CTA. Periksa: kata besar benar-benar bergradasi cyan (bukan hitam
buram), caption tidak menutup wajah, teks tidak terpotong di tepi, ikon emoji tampil berwarna.
Tunjukkan ke user dan **tunggu persetujuan** sebelum render penuh ("lanjut" saja bukan persetujuan render).

### 6. Render penuh dan laporkan
```
node SKILL_DIR/engine/render.mjs P --version 1
```
Jangan menimpa versi lama — naikkan `--version` tiap revisi. ±2–3 menit untuk 30 detik video. Verifikasi dengan
`ffprobe` (1080×1920, 30 fps, ada audio) dan `volumedetect` (max di bawah 0 dB). Laporkan path MP4, durasi, dan
isi tiap poin. Proses berjalan lama: jalankan di background.

## Masalah yang pernah terjadi

- **Kata besar hook/CTA tampil hitam buram.** Penyebab: `text-shadow` menimpa gradasi `background-clip: text`,
  dan kata per-span (punya transform/filter sendiri) tidak ikut terpotong gradasi induknya.
  Sudah diperbaiki di `stage-cyan.html`: `.gcy { text-shadow: none }` dan gradasi dipasang di tiap `.gcy .w`.
  Kalau menambah elemen gradasi baru, pakai pola yang sama.
- **Pesan "kata #N di luar potongan, dilewati"** normal: kata itu tidak ada di `segments`. Error baru muncul kalau
  field merujuk kata yang terbuang. Geser indeksnya atau pakai `wordFix`.
- **Emoji tampil hitam-putih / kotak.** Font emoji berwarna tidak ada di sistem. Windows: Segoe UI Emoji (bawaan);
  macOS: Apple Color Emoji (bawaan); Linux: pasang `fonts-noto-color-emoji`.
- **`chin.py gagal`** → Python yang dipakai belum punya OpenCV: `pip install opencv-python`, atau set env `PYTHON`.
- **File mentah dipindah** → perbarui `source` di `edit.json`.
- `engine/` dipakai bersama semua proyek cyan; mengubahnya mengubah semua proyek. Sebutkan di laporan.
