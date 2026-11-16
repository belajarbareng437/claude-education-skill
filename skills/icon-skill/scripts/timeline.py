"""Peta kata sebuah proyek: indeks, teks, waktu sumber, waktu output (setelah segments/cuts/wordFix).

Pakai:  python -I timeline.py <folder proyek> [--from IDX] [--to IDX]
Kata yang tidak ikut potongan ditandai "--". Logika pemetaan meniru engine/render.mjs.
"""
import argparse
import json
import pathlib

ap = argparse.ArgumentParser()
ap.add_argument("project")
ap.add_argument("--from", dest="lo", type=int, default=0)
ap.add_argument("--to", dest="hi", type=int, default=10**9)
a = ap.parse_args()

proj = pathlib.Path(a.project)
cfg = json.loads((proj / "edit.json").read_text(encoding="utf-8"))
fps = cfg.get("fps", 30)
words = json.loads((proj / cfg["words"]).resolve().read_text(encoding="utf-8"))["words"]  # path absolut juga jalan
fix = cfg.get("wordFix", {})

cuts = sorted(cfg.get("cuts", []))
pieces = []
for k, (s, e) in enumerate(cfg["segments"]):
    st = s
    for c0, c1 in cuts:
        if c0 > st and c1 < e:
            pieces.append((st, c0))
            st = c1
    pieces.append((st, e))
segs, off = [], 0.0
for s, e in pieces:
    n = round((e - s) * fps)
    segs.append((s, s + n / fps, off))
    off += n / fps


def out_t(t):
    for s, e, o in segs:
        if s - 0.25 <= t <= e + 0.05:
            return o + min(max(t, s), e) - s
    return None


print(f"{'idx':>4}  {'kata':<18} {'sumber':>7} {'output':>7}")
for i, w in enumerate(words):
    if not (a.lo <= i <= a.hi):
        continue
    w = {**w, **fix.get(str(i), {})}
    o = out_t(w["start"])
    print(f"{i:>4}  {w['word'][:18]:<18} {w['start']:>7.2f} {('%.2f' % o) if o is not None else '--':>7}")
print(f"\ndurasi output ~{off:.2f} s (+ tail {cfg.get('tail', 0)} s)")
