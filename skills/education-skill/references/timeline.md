# `timeline.json`: format bersama

Satu file ini menggambarkan seluruh video. Kedua mesin membacanya:
- **Remotion**: `public/timeline.json` di proyek Remotion (dibaca saat render, tanpa ubah kode).
- **HyperFrames**: `python build_hyperframes.py timeline.json` menulis `index.html`.

Semua waktu dalam **detik pada video hasil** (setelah jeda dipotong oleh `cut_pauses.py`).

```jsonc
{
  "width": 1080, "height": 1920, "fps": 30,
  "duration": 42.5,                       // detik; boleh dihapus → diambil dari video
  "video": "cut.mp4",                     // path relatif ke folder public/ (Remotion) atau folder HTML (HyperFrames)
  "glue": ["Google Search Console"],      // istilah yang tak boleh terbelah di subtitle (dipakai captions.py)

  "captions": [                           // dibuat oleh captions.py; jangan ditulis tangan
    { "start": 0.42, "end": 1.30, "words": [ { "text": "Tiga", "start": 0.42, "end": 0.70 }, ... ] }
  ],

  "framing": [                            // potongan lebar/close-up; di luar rentang = lebar
    { "start": 3.2, "end": 7.9, "zoom": 1.35, "focusY": 0.35 }
  ],

  "scenes": [
    { "type": "serifCard", "start": 0, "end": 2.6,
      "kicker": "3 CARA", "title": "Website kamu muncul di Google", "highlight": "Google" },

    { "type": "pointTitle", "start": 3.0, "end": 6.0,
      "number": 1, "title": "Daftar Search Console", "icons": ["search", "chart", "check"] },

    { "type": "floatIcons", "start": 8.0, "end": 10.0, "icons": ["phone", "globe", "star"] },

    { "type": "fullscreen", "start": 11.0, "end": 14.0, "bg": "ink",
      "content": { "kind": "count", "value": 87, "suffix": "%", "label": "klik ke halaman 1" } },

    { "type": "fullscreen", "start": 20.0, "end": 23.5, "bg": "lime",
      "content": { "kind": "list", "title": "Wajib ada",
                   "rows": [ { "text": "Judul jelas", "mark": "check" },
                             { "text": "Isi asal-asalan", "mark": "cross" } ] } },

    { "type": "fullscreen", "start": 25, "end": 28, "bg": "paper",
      "content": { "kind": "chips", "title": "Kata kunci", "chips": ["jasa", "murah", "terdekat"], "highlight": 2 } },

    { "type": "fullscreen", "start": 30, "end": 32.5, "bg": "navy",
      "content": { "kind": "toggle", "label": "Indeks halaman", "off": "Belum", "on": "Aktif" } },

    { "type": "fullscreen", "start": 34, "end": 37, "bg": "split",
      "content": { "kind": "split", "left": { "title": "Sebelum", "text": "Tidak muncul" },
                                    "right": { "title": "Sesudah", "text": "Halaman 1" } } },

    { "type": "sheet", "start": 38, "end": 40.5,
      "title": "Ringkasan", "rows": ["Daftar", "Optimasi judul", "Kirim sitemap"] },

    { "type": "broll", "start": 15, "end": 18, "src": "broll/situs.mp4" },

    { "type": "serifCard", "start": 40.5, "end": 42.5, "kicker": "INGAT", "title": "Konsisten itu kuncinya", "highlight": "Konsisten" }
  ],

  "sfx": [                                // opsional; kalau kosong dibuat otomatis dari scenes
    { "t": 11.0, "kind": "whoosh", "volume": 0.6 }
  ]
}
```

## Aturan

- `bg` untuk `fullscreen`: `ink`, `lime`, `paper`, `navy`, `split`. Gilir, jangan dua yang sama berurutan.
- `icons`: nama dari daftar ikon bawaan: `search`, `chart`, `check`, `cross`, `star`, `phone`, `globe`, `cart`,
  `money`, `clock`, `user`, `heart`, `bolt`, `lock`, `mail`, `play`, `bulb`, `target`, `gear`, `doc`.
- Subtitle otomatis disembunyikan selama `serifCard`, `fullscreen` (kecuali `sheet`) dan `broll` layar penuh.
- SFX otomatis: `serifCard` → whoosh, `pointTitle` → pop, `floatIcons` → pop, `fullscreen` → whoosh
  (+ tick di akhir hitungan `count`), `sheet` → whoosh, `broll` → whoosh.
- Path `video`, `broll.src` relatif; taruh berkasnya di `public/` (Remotion) atau di samping `index.html` (HyperFrames).
