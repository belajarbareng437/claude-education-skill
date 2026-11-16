"""Buang jeda di antara kalimat dan tulis ulang waktu tiap kata.

Pemakaian:
  python -I cut_pauses.py <src.mp4> <words.json> <out.mp4> <out_words.json>
                          [--gap 0.6] [--pad 0.12] [--fps 30] [--crf 16] [--dry-run]

- Bagian yang dipertahankan = kumpulan kata yang jaraknya <= --gap detik, ditambah --pad di kiri/kanan.
- Video HLG (iPhone) otomatis di-tonemap ke SDR bt709.
- out_words.json berisi kata dengan waktu baru + daftar "segments" (asal -> hasil) untuk referensi.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile


def probe(src):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", src],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    return float(data["format"]["duration"]), v or {}, has_audio


def keep_ranges(words, duration, gap, pad):
    ranges = []
    for w in words:
        s, e = max(0.0, w["start"] - pad), min(duration, w["end"] + pad)
        if ranges and s - ranges[-1][1] <= gap - 2 * pad:
            ranges[-1][1] = max(ranges[-1][1], e)
        else:
            ranges.append([s, e])
    # gabungkan yang tumpang tindih karena padding
    merged = []
    for r in ranges:
        if merged and r[0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], r[1])
        else:
            merged.append(r)
    return merged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("words")
    ap.add_argument("out")
    ap.add_argument("out_words")
    ap.add_argument("--gap", type=float, default=0.6)
    ap.add_argument("--pad", type=float, default=0.12)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--crf", type=int, default=16)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    with open(a.words, encoding="utf-8") as f:
        wdata = json.load(f)
    words = wdata["words"]
    if not words:
        sys.exit("words.json kosong")

    duration, vstream, has_audio = probe(a.src)
    ranges = keep_ranges(words, duration, a.gap, a.pad)

    # peta waktu lama -> baru
    segs, offset = [], 0.0
    for s, e in ranges:
        segs.append({"src_start": round(s, 3), "src_end": round(e, 3), "out_start": round(offset, 3)})
        offset += e - s
    new_words = []
    for w in words:
        seg = next((g for g in segs if g["src_start"] - 1e-6 <= w["start"] <= g["src_end"] + 1e-6), None)
        if seg is None:
            continue
        shift = seg["out_start"] - seg["src_start"]
        new_words.append({**w, "start": round(w["start"] + shift, 3), "end": round(min(w["end"], seg["src_end"]) + shift, 3)})

    removed = duration - offset
    print(f"{len(ranges)} bagian dipertahankan, {removed:.1f} dtk jeda dibuang ({duration:.1f} -> {offset:.1f} dtk)")

    with open(a.out_words, "w", encoding="utf-8") as f:
        json.dump({**wdata, "words": new_words, "segments_map": segs, "duration": round(offset, 3)}, f, ensure_ascii=False, indent=1)
    if a.dry_run:
        return

    hlg = vstream.get("color_transfer") in ("arib-std-b67", "smpte2084")
    parts, labels = [], []
    for i, (s, e) in enumerate(ranges):
        parts.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];")
        if has_audio:
            parts.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={max(0, e - s - 0.01):.3f}:d=0.01[a{i}];")
            labels.append(f"[v{i}][a{i}]")
        else:
            labels.append(f"[v{i}]")
    n = len(ranges)
    parts.append("".join(labels) + f"concat=n={n}:v=1:a={1 if has_audio else 0}[vc]" + ("[a]" if has_audio else "") + ";")
    vchain = f"[vc]fps={a.fps}"
    if hlg:
        print("Video HDR/HLG terdeteksi -> tonemap ke SDR bt709")
        vchain += ",zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv"
    vchain += ",format=yuv420p[v]"
    parts.append(vchain)

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as tf:
        tf.write("\n".join(parts))
        script = tf.name
    try:
        tail = ["-map", "[v]"]
        if has_audio:
            tail += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
        tail += ["-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuv420p",
                 "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                 "-movflags", "+faststart", a.out]
        head = ["ffmpeg", "-y", "-v", "error", "-stats", "-i", a.src]
        # ffmpeg >= 7 memakai "-/filter_complex <file>"; versi lama memakai -filter_complex_script.
        if subprocess.run(head + ["-/filter_complex", script] + tail).returncode != 0:
            print("Mencoba ulang dengan -filter_complex_script (ffmpeg versi lama)...")
            subprocess.run(head + ["-filter_complex_script", script] + tail, check=True)
    finally:
        os.unlink(script)
    print(f"-> {a.out}\n-> {a.out_words}")


if __name__ == "__main__":
    main()
