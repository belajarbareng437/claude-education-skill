"""Lacak posisi dagu per frame (deteksi wajah Haar), untuk menaruh subtitle tepat di bawah dagu.

  python chin.py <folder frames> <keluaran.json>     (butuh: pip install opencv-python)

Keluaran: {"chin": [y per frame atau null], "face": [[x,y,w,h] atau null]} dalam piksel frame asli.
Frame tanpa wajah terdeteksi diberi null; render.mjs yang mengisi celah dan menghaluskan.
"""
import json
import pathlib
import sys

import cv2

frames = sorted(pathlib.Path(sys.argv[1]).glob("*.jpg"))
out = pathlib.Path(sys.argv[2])
casc = cv2.CascadeClassifier(str(pathlib.Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"))
if casc.empty():
    sys.exit("cascade wajah tidak termuat")

SCALE = 0.4  # deteksi di 432x768 supaya cepat
chin, faces, prev = [], [], None
for i, f in enumerate(frames):
    img = cv2.imread(str(f))
    H = img.shape[0]
    small = cv2.equalizeHist(cv2.cvtColor(cv2.resize(img, None, fx=SCALE, fy=SCALE), cv2.COLOR_BGR2GRAY))
    det = casc.detectMultiScale(small, scaleFactor=1.08, minNeighbors=6, minSize=(60, 60))
    best = None
    for (x, y, w, h) in det:
        x, y, w, h = (v / SCALE for v in (x, y, w, h))
        if y + h > H * 0.75:          # wajah tidak mungkin di seperempat bawah frame
            continue
        # pilih yang terbesar; kalau ada frame sebelumnya, utamakan yang paling dekat
        score = w * w - (abs((x + w / 2) - (prev[0] + prev[2] / 2)) * 40 if prev else 0)
        if best is None or score > best[0]:
            best = (score, [round(x), round(y), round(w), round(h)])
    if best:
        prev = best[1]
        faces.append(best[1])
        # kotak Haar berakhir sedikit di atas dagu: tambah ~8% tinggi kotak
        chin.append(round(best[1][1] + best[1][3] * 1.08))
    else:
        faces.append(None)
        chin.append(None)
    if i % 200 == 0:
        print(f"  wajah {i}/{len(frames)}", flush=True)

out.write_text(json.dumps({"chin": chin, "face": faces}))
hit = sum(c is not None for c in chin)
print(f"wajah terdeteksi di {hit}/{len(frames)} frame ({100 * hit / max(1, len(frames)):.0f}%)")
