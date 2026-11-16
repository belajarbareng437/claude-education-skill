# Gaya "endorse": panduan visual

Semua angka di sini untuk kanvas vertikal **1080×1920 @ 30 fps**. Untuk 16:9 (1920×1080) lihat §8.
Nilai yang sama ada di kode: `templates/remotion/src/theme.ts` dan `templates/hyperframes/build_hyperframes.py`
(blok `THEME`). Kalau mengubah gaya untuk seterusnya, ubah **keduanya** dan dokumen ini.

## 1. Warna

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `lime` | `#C8F031` | aksen utama: nomor poin, sorotan, centang, garis bawah judul |
| `ink` | `#0B0B0C` | latar infografis hitam, teks di atas lime |
| `paper` | `#F3EFE6` | kartu serif, latar infografis kertas |
| `paperDot` | `#D6CFBE` | titik-titik pola kertas (grid 28 px, titik 3 px) |
| `navy` | `#0E1A3A` | latar infografis navy + garis grid `rgba(255,255,255,.08)` 60 px |
| `white` | `#FFFFFF` | subtitle, teks di atas latar gelap |
| `red` | `#FF5A4E` | tanda ✗ |

Tidak ada gradien warna-warni. Satu aksen (lime) per layar.

## 2. Huruf

| Peran | Huruf | Cadangan bila tidak ada |
|---|---|---|
| Subtitle + judul poin | **Coolvetica** (lisensi berbayar, tidak disertakan) | Inter 700 |
| Infografis (angka, daftar, chip) | Inter Display / Inter 600–800 | Inter |
| Kartu serif pembuka/penutup | Bodoni (Bodoni Bk BT) | Bodoni Moda 500 |

Cara memasang Coolvetica sendiri: README → "Font".

## 3. Subtitle (gaya Apple)

- 2–3 kata per tampilan (`min 2`, `max 3`, maks ±22 karakter), potong di tanda baca.
- Istilah dalam daftar `glue` (mis. "Google Search Console", "AI") tidak boleh terbelah.
- Tiap kata muncul sendiri tepat saat diucapkan: opacity 0→1, naik 14 px→0, blur 8 px→0, durasi 0,18 detik.
- Putih, **tanpa garis tepi**, bayangan lembut `0 6px 24px rgba(0,0,0,.45)`.
- Ukuran 64 px, pusat baris di **y = 1250** (di bawah dagu). Tidak ada dua tampilan yang bertumpuk.
- Subtitle disembunyikan saat infografis layar penuh atau kartu serif tampil.

## 4. Kartu serif (pembuka dan penutup)

- Latar `paper` + pola titik. Muncul dengan fade 0,25 detik, keluar wipe ke atas.
- Teks kecil (kicker) Inter 600 34 px huruf kapital berjarak, warna `ink` 60 %.
- Judul Bodoni 112 px, rata tengah, maks 3 baris; satu kata kunci diberi stabilo lime di belakangnya.
- Pembuka menutupi kalimat pembuka (±2–3 detik). Penutup tampil tepat sebelum salam.

## 5. Judul poin + ikon mengapung

- Muncul saat narator bilang "yang pertama / kedua / ...".
- Pil kaca di y ≈ 300: latar `rgba(255,255,255,.16)`, blur latar 18 px, garis 1,5 px `rgba(255,255,255,.35)`, sudut penuh.
- Di kiri pil: lingkaran lime 84 px berisi nomor (`ink`, 44 px). Teks judul putih 54 px.
- Masuk: skala 0,85→1 + fade, 0,3 detik, sedikit memantul. SFX `pop`.
- 3 ikon garis (putih, tebal 6 px, 120 px) mengapung di atas/samping pil, masing-masing tertunda 0,08 detik dan bergoyang naik-turun 6 px.

## 6. Infografis layar penuh

Satu per poin. Masuk **wipe dari bawah** 0,35 detik (SFX `whoosh`), keluar wipe ke atas.
Latar bergiliran supaya tidak monoton: `ink` → `lime` bergaris → `paper` bertitik → `navy` grid → `sheet` → `split`.

| `kind` | Isi |
|---|---|
| `count` | angka besar Inter 800 260 px menghitung naik dari 0 (ease-out 1 detik, SFX `tick` di akhir) + label |
| `list` | 2–5 baris; tiap baris ikon ✓ (lime) / ✗ (merah) / • sorot, muncul bergiliran 0,12 detik |
| `chips` | kata kunci dalam pil, muncul bergiliran, satu pil bisa disorot lime |
| `toggle` | sakelar off→on dengan label sebelum/sesudah |
| `split` | dua kolom hitam/lime: "Sebelum" vs "Sesudah" |
| `sheet` | bottom-sheet putih naik dari bawah di atas video yang diredupkan, berisi judul + 2–4 baris |

## 7. Framing, B-roll, SFX

- Framing bergantian **lebar** (zoom 1,0) dan **close-up** (zoom 1,35, titik fokus wajah y≈0,35) tiap pergantian kalimat besar/poin. Ganti potong (cut), bukan zoom pelan.
- B-roll rekaman layar hanya untuk bagian endorse/promosi produk yang nyata. Jangan mengarang tampilan situs. Kartu membulat 40 px, bayangan, masuk dari bawah.
- SFX tanpa musik: `whoosh` (wipe), `pop` (judul poin, chip), `tick` (angka, centang). Volume 0,5–0,7, jangan menutupi suara.

## 8. Varian 16:9 (video panjang)

- Kanvas 1920×1080. Subtitle **3–5 kata**, 56 px, y = 650.
- Wajah tetap terlihat: daftar/poin pakai panel samping kanan (x 1240–1860), layar penuh hanya untuk angka penting.
- Saat panel/B-roll tampil subtitle bergeser ke kiri.
- Close-up: zoom 1,25.

## 9. Ritme (video 30–60 detik)

1. 0–3 dtk: kartu serif pembuka (hook).
2. Tiap poin: judul poin + ikon (2–3 dtk) → kalimat penjelas dengan subtitle → infografis layar penuh (2–4 dtk).
3. Ikon mengapung tiap ada benda/aplikasi penting disebut.
4. Kartu serif penutup (2–3 dtk) → salam/CTA dengan subtitle.
