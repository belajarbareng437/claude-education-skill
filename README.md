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
.claude-plugin/                manifest plugin + marketplace (untuk /plugin install)
skills/claude-education-skill/
├── SKILL.md                   instruksi untuk Claude (alur kerja, aturan gaya)
├── references/
│   ├── style.md               panduan visual: warna, huruf, ukuran, animasi, ritme
│   └── timeline.md            format timeline.json (satu data untuk dua mesin)
├── scripts/                   Python: doctor, transcribe, cut_pauses, captions, make_sfx, stills
└── templates/
    ├── remotion/              proyek Remotion siap pakai (baca public/timeline.json)
    └── hyperframes/           build_hyperframes.py → index.html untuk HyperFrames
```

## Yang perlu dipasang

| Alat | Untuk apa | Cara pasang |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | menjalankan skill | `npm install -g @anthropic-ai/claude-code` |
| Node.js **22+** | Remotion / HyperFrames | https://nodejs.org atau `winget install OpenJS.NodeJS.LTS` |
| Python **3.10+** | script persiapan | https://python.org atau `winget install Python.Python.3.13` |
| ffmpeg | potong jeda, audio, cek hasil | Windows `winget install Gyan.FFmpeg` · macOS `brew install ffmpeg` · Ubuntu `sudo apt install ffmpeg` |
| faster-whisper | transkripsi per kata | `pip install faster-whisper` |

Setelah skill terpasang, cek semuanya dengan mengetik di Claude Code:

```
/claude-education-skill cek alat
```

(atau dari folder hasil clone: `python skills/claude-education-skill/scripts/doctor.py`)

## Cara instal

Pilih **salah satu** opsi. Keduanya membuat skill bisa dipanggil dengan **`/claude-education-skill`**.

> **Pakai aplikasi Claude Desktop (Mac/Windows)?** Ikuti
> [Tutorial instal di Claude Desktop](#tutorial-instal-di-claude-desktop-mac--windows) — langkah demi langkah.

### Opsi A — sebagai plugin (disarankan, mudah di-update)

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

Lalu mulai ulang Claude Code (atau ketik `/reload-plugins`).

> Kenapa nama pluginnya `edukasi-video`, bukan `claude-education-skill`? Claude Code melarang nama **plugin**
> yang diawali `claude-` (dicadangkan untuk Anthropic). Nama **skill**-nya tetap `claude-education-skill`,
> jadi perintahnya tetap `/claude-education-skill`. Bentuk lengkapnya `/edukasi-video:claude-education-skill`
> — pakai bentuk ini kalau ada skill lain bernama sama.

Memperbarui ke versi terbaru:

```bash
claude plugin marketplace update edukasi-video
claude plugin update edukasi-video@edukasi-video
```

Menghapus:

```bash
claude plugin uninstall edukasi-video@edukasi-video
claude plugin marketplace remove edukasi-video
```

### Opsi B — salin folder skill secara manual

```bash
git clone https://github.com/belajarbareng437/claude-education-skill.git
```

**macOS / Linux**

```bash
mkdir -p ~/.claude/skills
cp -r claude-education-skill/skills/claude-education-skill ~/.claude/skills/
```

**Windows (PowerShell)**

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse claude-education-skill\skills\claude-education-skill "$env:USERPROFILE\.claude\skills\"
```

Untuk satu proyek saja, salin ke `<proyek>/.claude/skills/` alih-alih folder home.
Mulai ulang Claude Code. Jangan pasang Opsi A dan B bersamaan, supaya tidak ada dua skill bernama sama.

## Tutorial instal di Claude Desktop (Mac & Windows)

Aplikasi Claude Desktop punya dua tempat memakai skill. Pilih sesuai kebutuhan:

| | **Cara 1: tab Code** (disarankan) | **Cara 2: chat biasa** |
|---|---|---|
| Untuk | Edit video sungguhan sampai jadi MP4 | Merencanakan adegan, membuat `timeline.json` / `index.html` |
| Akses file di komputer | Ya | Tidak — video harus diunggah ke chat |
| Bisa render video | Ya (Remotion / HyperFrames di komputer Anda) | Biasanya tidak (sandbox terbatas); hasil dirender sendiri di komputer |
| Cara memanggil | `/claude-education-skill` | Minta dengan bahasa biasa, mis. "edit video ini gaya endorse" |

---

### Cara 1 — Tab **Code** di Claude Desktop

Tab Code di Claude Desktop memakai folder skill yang sama dengan Claude Code (`~/.claude/skills`),
jadi skill cukup dipasang sekali.

#### 🍎 macOS (MacBook)

1. **Pasang alat pendukung.** Buka aplikasi **Terminal** (Cmd + Spasi → ketik `Terminal`), lalu jalankan:
   ```bash
   # Homebrew (lewati jika sudah ada)
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   brew install node ffmpeg python git
   pip3 install faster-whisper
   ```
2. **Unduh skill dan salin ke folder skill Claude:**
   ```bash
   cd ~/Downloads
   git clone https://github.com/belajarbareng437/claude-education-skill.git
   mkdir -p ~/.claude/skills
   cp -r claude-education-skill/skills/claude-education-skill ~/.claude/skills/
   ```
3. **Tutup Claude Desktop sepenuhnya** (Cmd + Q), lalu buka lagi.
4. Klik tab **Code**, pilih folder kerja (mis. folder tempat video Anda), lalu ketik:
   ```
   /claude-education-skill cek alat
   ```
   Semua baris harus `OK`. Setelah itu coba `/claude-education-skill demo`.

#### 🪟 Windows

1. **Pasang alat pendukung.** Klik Start → ketik `PowerShell` → buka **Windows PowerShell**, lalu jalankan
   (klik **Yes** bila muncul jendela izin Administrator):
   ```powershell
   winget install OpenJS.NodeJS.LTS
   winget install Gyan.FFmpeg
   winget install Python.Python.3.13
   winget install Git.Git
   ```
   **Tutup PowerShell, buka lagi** (agar perintah baru dikenali), lalu:
   ```powershell
   pip install faster-whisper
   ```
2. **Unduh skill dan salin ke folder skill Claude:**
   ```powershell
   cd $env:USERPROFILE\Downloads
   git clone https://github.com/belajarbareng437/claude-education-skill.git
   New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
   Copy-Item -Recurse -Force claude-education-skill\skills\claude-education-skill "$env:USERPROFILE\.claude\skills\"
   ```
   Tanpa Git? Buka https://github.com/belajarbareng437/claude-education-skill → tombol hijau **Code** →
   **Download ZIP** → ekstrak, lalu salin folder `skills\claude-education-skill` ke
   `C:\Users\<nama-anda>\.claude\skills\` lewat File Explorer (ketik `%USERPROFILE%\.claude\skills` di
   address bar; buat foldernya bila belum ada).
3. **Tutup Claude Desktop sepenuhnya** (klik kanan ikon Claude di system tray → **Quit**), lalu buka lagi.
4. Klik tab **Code**, pilih folder kerja, lalu ketik:
   ```
   /claude-education-skill cek alat
   ```

> Sudah memasang Claude Code CLI? Anda juga bisa memakai **Opsi A (plugin)** di atas — hasilnya terbaca
> juga oleh tab Code di Claude Desktop. Jangan pasang plugin dan salinan manual bersamaan.

**Update ke versi terbaru (Mac & Windows):** masuk ke folder `claude-education-skill` hasil clone, jalankan
`git pull`, lalu ulangi perintah salin di langkah 2 dan buka ulang Claude Desktop.

---

### Cara 2 — Chat biasa di Claude Desktop (unggah ZIP)

Langkahnya sama di Mac dan Windows.

1. **Unduh ZIP skill:** buka halaman
   [Releases](https://github.com/belajarbareng437/claude-education-skill/releases/latest) →
   unduh **`edukasi-video-endorse.zip`**. **Jangan diekstrak.**
   (Atau buat sendiri dari folder clone: `python tools/build_desktop_zip.py` → `dist/edukasi-video-endorse.zip`.)
2. Buka Claude Desktop → **Settings** (Mac: Cmd + , · Windows: Ctrl + , atau klik nama Anda di kiri bawah →
   Settings) → **Capabilities** → nyalakan **Code execution and file creation**
   (di tampilan baru bernama **Create and edit files**).
3. Buka **Customize → Skills** → klik **+** → **Create skill** → **Upload a skill** → pilih
   `edukasi-video-endorse.zip`.
4. Pastikan skill **edukasi-video-endorse** muncul dan sakelarnya menyala.
5. Di chat baru, unggah video (klip pendek, ≤ 1–2 menit) dan tulis misalnya:
   > Edit video ini gaya endorse, topiknya 3 cara SEO. Buatkan timeline dan index.html HyperFrames.

   Claude akan menyusun `timeline.json` dan `index.html` untuk diunduh. Render di komputer Anda dengan
   `npx hyperframes render -o video.mp4` di folder file tersebut (butuh Node.js dan ffmpeg).

**Catatan Cara 2**
- Di chat biasa skill bernama `edukasi-video-endorse` (bukan `claude-education-skill`), karena unggahan skill
  di aplikasi Claude membatasi deskripsi 200 karakter dan bisa menolak nama yang memuat kata "claude".
- Paket Team/Enterprise: admin harus mengizinkan skill dan code execution di **Organization settings**.
- Update: hapus skill lama di **Customize → Skills**, lalu unggah ZIP versi terbaru.

### Bila skill tidak muncul

| Gejala | Solusi |
|---|---|
| `/claude-education-skill` tidak ada di daftar `/` | Pastikan file ada di `~/.claude/skills/claude-education-skill/SKILL.md` (Windows: `%USERPROFILE%\.claude\skills\claude-education-skill\SKILL.md`) — bukan bertingkat dua folder — lalu tutup penuh dan buka ulang Claude Desktop. |
| `cek alat` bilang `node`/`ffmpeg` tidak ditemukan | Tutup dan buka ulang Claude Desktop setelah memasang alat (PATH baru belum terbaca). Windows: log out/log in bila perlu. |
| Unggah ZIP gagal "Missing SKILL.md" | Unggah ZIP dari Releases apa adanya; jangan ZIP ulang seluruh repo. |
| Unggah ZIP gagal karena code execution | Nyalakan **Code execution and file creation** di Settings → Capabilities. |

## Cek bahwa skill sudah terpasang

Di Claude Code ketik `/` lalu `claude-edu` — `/claude-education-skill` harus muncul di daftar.
Atau jalankan `/skills` untuk melihat semua skill yang aktif.

## Cara pakai

### Memanggil dengan perintah

```
/claude-education-skill <video> [remotion|hyperframes] [topik / catatan]
```

Contoh:

```
/claude-education-skill D:\video\tips-seo.mov remotion topiknya 3 cara website muncul di Google
```

```
/claude-education-skill rekaman-panjang.mp4 hyperframes video 16:9, buat infografis tiap poin
```

```
/claude-education-skill demo
```
(menampilkan contoh bawaan tanpa video — cocok untuk mencoba pertama kali)

```
/claude-education-skill cek alat
```
(mengecek Node, ffmpeg, Python, faster-whisper)

Kalau mesin tidak disebut, dipakai **Remotion**.

### Atau minta dengan bahasa biasa

Claude juga memakai skill ini sendiri bila permintaannya cocok, tanpa perlu `/`:

> Edit video `D:\video\tips-seo.mov` gaya endorse pakai Remotion. Topiknya 3 cara website muncul di Google.

### Yang terjadi setelah dipanggil

1. Transkripsi per kata → potong jeda otomatis.
2. Claude menyusun adegan di `timeline.json` (kartu pembuka, judul poin, infografis, kartu penutup).
3. Claude menunjukkan **storyboard** (gambar diam) + daftar "yang perlu dicek".
4. **Render penuh hanya setelah Anda bilang "oke render"/"setuju".**
5. Hasil MP4 dicek durasi dan frame-nya, lalu dilaporkan.

### Menjalankan manual (tanpa Claude)

Dari folder hasil `git clone`:

```bash
S="$PWD/claude-education-skill/skills/claude-education-skill"   # lokasi skill

# 1. Siapkan proyek Remotion
cp -r "$S/templates/remotion" my-video && cd my-video && npm install

# 2. Transkripsi + potong jeda
python -I "$S/scripts/transcribe.py" ../mentah.mp4 words.json --prompt "SEO, Google, Search Console"
python -I "$S/scripts/cut_pauses.py" ../mentah.mp4 words.json public/cut.mp4 words_cut.json

# 3. Tulis adegan di public/timeline.json (lihat references/timeline.md), set "video": "cut.mp4", lalu:
python -I "$S/scripts/captions.py" words_cut.json public/timeline.json

# 4. Preview & render
npx remotion studio                                   # pratinjau di browser
npx remotion render Endorse out/video.mp4 --codec=h264 --crf=18
```

Dengan **HyperFrames** (langkah 2–3 sama, tapi file di folder biasa, bukan `public/`):

```bash
python -I "$S/templates/hyperframes/build_hyperframes.py" my-hf/timeline.json my-hf/index.html
cd my-hf
npx hyperframes lint .
npx hyperframes preview
npx hyperframes render -o out/video.mp4
```

Melihat contoh demo tanpa video:

```bash
cd "$S/templates/remotion" && npm install && npx remotion studio
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
