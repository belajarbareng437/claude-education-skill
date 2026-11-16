---
name: claude-education-skill
description: Edit video talking-head mentah (vertikal 9:16 atau 16:9, bahasa Indonesia) jadi video tips/edukasi bergaya "endorse" — aksen hijau lime, kartu pembuka/penutup serif di kertas bertitik, subtitle gaya Apple 2–3 kata (kata muncul satu per satu, blur ke tajam), judul poin pil kaca + ikon mengapung, infografis layar penuh (angka menghitung, daftar ✓/✗, chip, toggle, split, bottom-sheet), framing lebar/close-up bergantian, SFX swoosh/pop/tik tanpa musik — dan merendernya dengan Remotion atau HyperFrames (HTML + GSAP). Gunakan setiap kali user ingin mengedit/membuat video "gaya endorse", video review/promosi produk atau jasa, video "N cara/tips/langkah", infografis layar penuh, subtitle gaya Apple, atau menyebut Remotion/HyperFrames untuk video talking-head — walaupun kata "skill" tidak disebut.
argument-hint: "<video> [remotion|hyperframes] [topik/catatan] | demo | cek alat"
---

# Edit video: gaya "endorse"

Dari satu video mentah orang bicara ke kamera, hasilkan video tips bergaya dengan **satu file data**
(`timeline.json`) yang bisa dirender oleh dua mesin:

| Mesin | Kapan dipakai | Template |
|---|---|---|
| **Remotion** (bawaan) | Paling lengkap; React + TypeScript; render `npx remotion render` | `templates/remotion/` |
| **HyperFrames** | Tanpa build step; HTML + GSAP; render `npx hyperframes render` | `templates/hyperframes/` |

Kalau user tidak menyebut mesin, pakai **Remotion**. Bicara ke user dalam **Bahasa Indonesia**, singkat dan non-teknis.

## Saat dipanggil dengan `/claude-education-skill`

Argumen dari user: `$ARGUMENTS`

| Argumen | Yang dilakukan |
|---|---|
| kosong | Sapa singkat, jelaskan 1 kalimat apa yang skill ini buat, lalu tanya: path video, mesin (Remotion/HyperFrames), topik. |
| `cek alat` / `doctor` | Jalankan `scripts/doctor.py`, laporkan yang kurang beserta perintah pasangnya. Berhenti di situ. |
| `demo` | Salin `templates/remotion/` ke folder kerja, `npm install`, render 3–4 still dari timeline demo bawaan, tunjukkan ke user. Tawarkan `npx remotion studio`. |
| path video (+ `remotion`/`hyperframes`, topik) | Jalankan **Alur kerja** di bawah dengan video itu. Mesin tak disebut → Remotion. |
| teks lain | Anggap sebagai permintaan perubahan pada video yang sedang dikerjakan di sesi ini; bila tidak ada, tanya video mana. |

Path video bisa berisi spasi atau tanda kutip — ambil apa adanya dan cek dulu dengan `ffprobe` sebelum lanjut.

## Lokasi

`SKILL_DIR` di bawah = folder skill ini (baris "Base directory for this skill" saat skill dimuat;
bisa di `~/.claude/skills/` atau di cache plugin). Jangan menulis hasil kerja ke dalam `SKILL_DIR` —
buat folder kerja terpisah. Perintah Python: `python` di Windows, `python3` di macOS/Linux. Sebelum mendesain adegan,
baca `references/style.md` (gaya visual) dan `references/timeline.md` (format data).

## Persyaratan

Node.js ≥ 22, Python ≥ 3.10, ffmpeg. Transkripsi: `pip install faster-whisper`. Cek dengan
`python SKILL_DIR/scripts/doctor.py`. Kalau ada yang kurang, beri tahu user perintah pasangnya (README) —
jangan memasang diam-diam.

## Script (semua Python, jalankan dengan `python -I`)

| File | Fungsi |
|---|---|
| `scripts/doctor.py` | Cek node, npm, ffmpeg, ffprobe, faster-whisper. |
| `scripts/transcribe.py <video> <words.json> [--lang id] [--prompt "istilah"] [--model small]` | faster-whisper, timestamp per kata. |
| `scripts/cut_pauses.py <video> <words.json> <out.mp4> <out_words.json> [--gap 0.6] [--pad 0.12]` | Buang jeda > gap, tulis video terpotong + kata dengan waktu baru. Otomatis tonemap HLG (iPhone) ke SDR. |
| `scripts/captions.py <words.json> <timeline.json> [--min 2 --max 3 --maxch 22] [--fix "salah=benar" ...]` | Pecah kata jadi tampilan 2–3 kata (hormati `glue` di timeline), tulis ke `captions` di timeline.json. |
| `scripts/make_sfx.py <folder>` | Buat `whoosh.wav`, `pop.wav`, `tick.wav` (sintetis, tanpa lisensi). |
| `scripts/stills.py <video_hasil.mp4> <folder> <detik...>` | Ambil frame cek dari hasil render untuk storyboard. |
| `templates/hyperframes/build_hyperframes.py <timeline.json> <index.html>` | Ubah timeline jadi komposisi HyperFrames. |

## Alur kerja

1. **Folder kerja**: satu folder per video (di scratchpad sesi atau tempat yang user tentukan).
   - Remotion: salin `templates/remotion/` ke folder kerja lalu `npm install` (sekali per folder).
   - HyperFrames: cukup folder kosong; `index.html` dibuat oleh `SKILL_DIR/templates/hyperframes/build_hyperframes.py`
     (jalankan langsung dari SKILL_DIR, jangan disalin — ia membaca ikon dari template Remotion).
   Aset (video, sfx, b-roll) masuk ke `public/` (Remotion) atau ke folder yang sama dengan `index.html` (HyperFrames).
   SFX Remotion sudah ada di `public/sfx/`; untuk HyperFrames dibuat otomatis oleh build_hyperframes.py.
2. **Siapkan audio & transkrip**:
   `python -I transcribe.py SRC words.json --prompt "<topik, nama merek, nama channel>"`.
3. **Potong jeda**: `python -I cut_pauses.py SRC words.json public/cut.mp4 words_cut.json`.
4. **Koreksi transkrip**: perbaiki hanya istilah/merek/nama yang salah dengar (pakai `--fix` di captions.py
   atau sunting `words_cut.json`). Tanyakan ke user nama channel/merek bila ragu — jangan menebak.
5. **Susun adegan** di `timeline.json` mengikuti ritme `style.md` §9:
   kartu serif pembuka menutupi kalimat pembuka; `pointTitle` + ikon tiap "yang pertama/kedua…";
   satu `fullscreen` per poin (latar bergiliran); `floatIcons` saat benda penting disebut; framing
   lebar/close-up bergantian; kartu serif penutup sebelum salam. Kunci waktu ke kata di `words_cut.json`.
   Lalu `python -I captions.py words_cut.json timeline.json`.
6. **B-roll** hanya bila video punya bagian endorse produk/situs nyata — minta rekaman layarnya ke user;
   jangan mengarang tampilan situs.
7. **Preview dulu, render penuh belakangan**:
   - Remotion: `npx remotion still Endorse stills/sNN.png --frame=<detik*fps>` untuk tiap adegan, atau
     `npx remotion studio` agar user melihat langsung.
   - HyperFrames: `python build_hyperframes.py timeline.json index.html` lalu `npx hyperframes lint .` dan
     `npx hyperframes preview`.
   Tunjukkan stills + daftar "Yang perlu dicek" (tafsiran isi, nama, angka ilustrasi). **Render penuh hanya
   setelah user bilang setuju / oke render** — "lanjut" saja bukan persetujuan.
8. **Render penuh** (di background):
   - Remotion: `npx remotion render Endorse out/<nama>_edit.mp4 --codec=h264 --crf=18`
   - HyperFrames: `npx hyperframes render -o out/<nama>_edit.mp4`
   Lalu cek durasi dengan ffprobe, ambil 3 frame cek dengan `stills.py`, laporkan.

## Keputusan gaya yang sudah final (jangan diubah tanpa diminta)

- Subtitle gaya Apple 64 px, 2–3 kata, tiap kata muncul sendiri (fade + naik 14 px + blur→tajam), putih
  tanpa garis tepi, bayangan lembut, y = 1250, tidak bertumpuk.
- Satu aksen: lime `#C8F031`. Tanpa musik; hanya SFX.
- Perubahan gaya yang user minta "untuk seterusnya" → ubah `templates/remotion/src/theme.ts`, blok `THEME`
  di `build_hyperframes.py`, dan `references/style.md` bersamaan.

## Video 16:9

Set `"width": 1920, "height": 1080` di timeline.json dan `captions.py --min 3 --max 5 --maxch 40`.
Kedua template otomatis memakai ukuran subtitle 56 px di y = 650 dan zoom close-up 1,25 (style.md §8).
Utamakan wajah tetap terlihat: pakai `sheet` atau `floatIcons` ketimbang `fullscreen` kecuali untuk angka penting.
