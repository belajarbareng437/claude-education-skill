"""Pecah kata jadi tampilan subtitle 2-3 kata dan tulis ke timeline.json.

Pemakaian:
  python -I captions.py <words.json> <timeline.json> [--min 2] [--max 3] [--maxch 22]
                        [--fix "salah=benar" ...] [--glue "Istilah Panjang" ...]

- Istilah di `glue` (dari timeline.json dan --glue) tidak akan terbelah.
- Pecah di tanda baca (. , ? ! : ;) dan di jeda > 0,45 dtk.
- Titik/koma di akhir kata dibuang dari tampilan; ? dan ! dipertahankan.
- --fix memperbaiki kata yang salah dengar (tidak peka huruf besar/kecil), mis. --fix "serc=Search" --fix "gugel=Google".
"""
import argparse
import json
import re

PUNCT_BREAK = re.compile(r"[.,?!:;]$")
SENTENCE_END = re.compile(r"[.?!]$")
STRIP = re.compile(r"[.,:;]+$")


def norm(t):
    return re.sub(r"[^\w]", "", t.lower())


def apply_fixes(words, fixes):
    table = {}
    for f in fixes:
        if "=" in f:
            k, v = f.split("=", 1)
            table[norm(k)] = v
    out = []
    for w in words:
        key = norm(w["text"])
        if key in table:
            trail = re.search(r"[.,?!:;]+$", w["text"])
            w = {**w, "text": table[key] + (trail.group(0) if trail else "")}
        out.append(w)
    return out


def apply_glue(words, glue):
    phrases = sorted(([norm(x) for x in g.split()] for g in glue if g.strip()), key=len, reverse=True)
    out, i = [], 0
    while i < len(words):
        for p in phrases:
            n = len(p)
            if n > 1 and [norm(w["text"]) for w in words[i:i + n]] == p:
                grp = words[i:i + n]
                out.append({"text": " ".join(w["text"] for w in grp), "start": grp[0]["start"], "end": grp[-1]["end"], "glued": True})
                i += n
                break
        else:
            out.append(words[i])
            i += 1
    return out


def chunk(words, mn, mx, maxch, pause=0.45):
    chunks, cur = [], []

    def length(ws):
        return sum(len(w["text"]) for w in ws) + max(0, len(ws) - 1)

    for i, w in enumerate(words):
        if cur and (len(cur) >= mx or length(cur + [w]) > maxch):
            chunks.append(cur)
            cur = []
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start"] - w["end"]) if nxt else 99
        if SENTENCE_END.search(w["text"]):  # akhir kalimat selalu memutus, berapa pun jumlah katanya
            chunks.append(cur)
            cur = []
        elif len(cur) >= mn and (PUNCT_BREAK.search(w["text"]) or gap > pause):
            chunks.append(cur)
            cur = []
        elif gap > 1.2:  # jeda panjang: putus meski baru 1 kata
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)

    # satu kata yatim di akhir kalimat -> gabung ke sebelumnya bila muat
    merged = []
    for c in chunks:
        if merged and len(c) == 1 and len(merged[-1]) < mx and c[0]["start"] - merged[-1][-1]["end"] < 0.3 \
                and not PUNCT_BREAK.search(merged[-1][-1]["text"]) and length(merged[-1] + c) <= maxch:
            merged[-1] = merged[-1] + c
        else:
            merged.append(c)
    return merged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words")
    ap.add_argument("timeline")
    ap.add_argument("--min", type=int, default=2)
    ap.add_argument("--max", type=int, default=3)
    ap.add_argument("--maxch", type=int, default=22)
    ap.add_argument("--fix", action="append", default=[])
    ap.add_argument("--glue", action="append", default=[])
    a = ap.parse_args()

    with open(a.words, encoding="utf-8") as f:
        wdata = json.load(f)
    words = wdata["words"]
    try:
        with open(a.timeline, encoding="utf-8") as f:
            tl = json.load(f)
    except FileNotFoundError:
        tl = {"width": 1080, "height": 1920, "fps": 30, "video": "cut.mp4", "glue": [], "scenes": [], "framing": []}

    words = apply_fixes(words, a.fix)
    words = apply_glue(words, list(tl.get("glue", [])) + a.glue)
    chunks = chunk(words, a.min, a.max, a.maxch)

    caps = []
    for i, c in enumerate(chunks):
        nxt = chunks[i + 1][0]["start"] if i + 1 < len(chunks) else c[-1]["end"] + 0.4
        end = min(c[-1]["end"] + 0.25, nxt - 0.02)
        caps.append({
            "start": round(c[0]["start"], 3),
            "end": round(max(end, c[-1]["end"]), 3),
            "words": [{"text": STRIP.sub("", w["text"]) or w["text"], "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in c],
        })
    tl["captions"] = caps
    if "duration" in wdata:  # dari cut_pauses.py: durasi video hasil potong
        tl["duration"] = wdata["duration"]
    with open(a.timeline, "w", encoding="utf-8") as f:
        json.dump(tl, f, ensure_ascii=False, indent=2)

    for c in caps[:12]:
        print(f"[{c['start']:6.2f}-{c['end']:6.2f}] " + " ".join(w["text"] for w in c["words"]))
    if len(caps) > 12:
        print(f"... ({len(caps)} tampilan)")
    print(f"-> {a.timeline}")


if __name__ == "__main__":
    main()
