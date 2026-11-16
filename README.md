# Claude Education Skill

Skill [Claude Code](https://claude.com/claude-code) untuk mengubah video mentah **orang bicara ke kamera**
menjadi video tips/edukasi vertikal yang rapi dan bergaya "endorse". Hasilnya bisa dirender dengan
**[Remotion](https://www.remotion.dev)** (React) atau **[HyperFrames](https://github.com/heygen-com/hyperframes)** (HTML + GSAP).

Ciri gayanya: aksen hijau lime, kartu pembuka/penutup serif di kertas bertitik, subtitle gaya Apple 2–3 kata
(tiap kata muncul sendiri, dari buram ke tajam), judul poin di pil kaca dengan ikon mengapung, infografis
layar penuh (angka menghitung, daftar ✓/✗, chip, toggle, split, bottom-sheet), framing lebar dan close-up
bergantian, plus SFX swoosh/pop/tik tanpa musik.

![Contoh frame dari timeline demo](docs/preview.jpg)

## Isi repo

```
.claude-plugin/              manifest plugin + marketplace (untuk /plugin install)
skills/edit-video-endorse/
├── SKILL.md                 instruksi untuk Claude (alur kerja, aturan gaya)
├── references/
│   ├── style.md             panduan visual: warna, huruf, ukuran, animasi, ritme
│   └── timeline.md          format timeline.json (satu data untuk dua mesin)
├── scripts/                 Python: doctor, transcribe, cut_pauses, captions, make_sfx, stills
└── templates/
    ├── remotion/            proyek Remotion siap pakai (baca public/timeline.json)
    └── hyperframes/         build_hyperframes.py → index.html untuk HyperFrames
```

## Yang perlu dipasang

| Alat | Untuk apa | Cara pasang |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | menjalankan skill | `npm install -g @anthropic-ai/claude-code` |
| Node.js **22+** | Remotion / HyperFrames | https://nodejs.org atau `winget install OpenJS.NodeJS.LTS` |
| Python **3.10+** | script persiapan | https://python.org atau `winget install Python.Python.3.13` |
| ffmpeg | potong jeda, audio, cek hasil | Windows `winget install Gyan.FFmpeg` · macOS `brew install ffmpeg` · Ubuntu `sudo apt install ffmpeg` |
| faster-whisper | transkripsi per kata | `pip install faster-whisper` |

Cek semuanya sekaligus setelah skill terpasang:

```bash
python skills/edit-video-endorse/scripts/doctor.py
```

## Cara instal

### Opsi A — sebagai plugin (disarankan)

Di terminal:

```bash
claude plugin marketplace add belajarbareng437/claude-education-skill
claude plugin install edukasi-video@edukasi-video
```

Atau dari dalam Claude Code:

```
/plugin marketplace add belajarbareng437/claude-education-skill
/plugin install edukasi-video@edukasi-video
```

Mulai ulang Claude Code (atau jalankan `/reload-plugins`). Skill bisa dipanggil dengan
`/edukasi-video:edit-video-endorse`, dan Claude juga memakainya sendiri saat Anda minta mengedit video.

Memperbarui ke versi terbaru:

```bash
claude plugin marketplace update edukasi-video
claude plugin update edukasi-video@edukasi-video
```

### Opsi B — salin folder skill secara manual

```bash
git clone https://github.com/belajarbareng437/claude-education-skill.git
```

**macOS / Linux**

```bash
mkdir -p ~/.claude/skills
cp -r claude-education-skill/skills/edit-video-endorse ~/.claude/skills/
```

**Windows (PowerShell)**

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse claude-education-skill\skills\edit-video-endorse "$env:USERPROFILE\.claude\skills\"
```

Untuk satu proyek saja, salin ke `<proyek>/.claude/skills/` alih-alih folder home.
Skill lalu dipanggil dengan `/edit-video-endorse`.

## Cara pakai

Cukup minta dalam bahasa biasa di Claude Code, misalnya:

> Edit video `D:\video\tips-seo.mov` gaya endorse pakai Remotion. Topiknya 3 cara website muncul di Google.

> Pakai HyperFrames, video 16:9 `rekaman-panjang.mp4`, buat infografis tiap poin.

Claude akan: transkripsi → potong jeda → menyusun adegan di `timeline.json` → menunjukkan storyboard
(gambar diam) → **menunggu persetujuan Anda** → render MP4.

### Menjalankan manual (tanpa Claude)

```bash
S=skills/edit-video-endorse            # lokasi skill

# 1. Siapkan proyek Remotion
cp -r $S/templates/remotion my-video && cd my-video && npm install

# 2. Transkripsi + potong jeda
python -I ../$S/scripts/transcribe.py ../mentah.mp4 words.json --prompt "SEO, Google, Search Console"
python -I ../$S/scripts/cut_pauses.py ../mentah.mp4 words.json public/cut.mp4 words_cut.json

# 3. Tulis adegan di public/timeline.json (lihat references/timeline.md), set "video": "cut.mp4", lalu:
python -I ../$S/scripts/captions.py words_cut.json public/timeline.json

# 4. Preview & render
npx remotion studio                                   # pratinjau di browser
npx remotion render Endorse out/video.mp4 --codec=h264 --crf=18
```

Dengan **HyperFrames** (langkah 1–3 sama, tapi pakai folder biasa, bukan `public/`):

```bash
python -I $S/templates/hyperframes/build_hyperframes.py my-hf/timeline.json my-hf/index.html
cd my-hf
npx hyperframes lint .
npx hyperframes preview
npx hyperframes render -o out/video.mp4
```

Ingin melihat contohnya dulu tanpa video? Template Remotion sudah berisi `public/timeline.json` demo:

```bash
cd skills/edit-video-endorse/templates/remotion && npm install && npx remotion studio
```

## Font

- **Inter** dan **Bodoni Moda** (Google Fonts) dimuat otomatis.
- Gaya aslinya memakai **Coolvetica** untuk subtitle. Font ini berlisensi (Typodermic), jadi **tidak disertakan**.
  Kalau Anda punya lisensinya, taruh file-nya di `public/fonts/Coolvetica.otf` (Remotion) atau di samping
  `index.html` (HyperFrames), lalu tambahkan ke `timeline.json`:
  ```json
  "subtitleFont": "fonts/Coolvetica.otf"
  ```
  Tanpa itu subtitle memakai Inter Bold.

## Lisensi

- Kode di repo ini: [MIT](LICENSE).
- SFX dibuat sintetis oleh `make_sfx.py`, bebas dipakai.
- **Remotion** punya lisensi sendiri: gratis untuk perorangan dan perusahaan kecil, perusahaan besar perlu
  lisensi berbayar — lihat https://www.remotion.dev/license.
- **HyperFrames** berlisensi Apache 2.0.
