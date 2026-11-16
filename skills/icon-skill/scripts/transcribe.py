"""Transkrip video/audio dengan Whisper (faster-whisper) -> timing per kata + subtitle.

Pakai:
  python -I transcribe.py video.mp4 --out work
  python -I transcribe.py video.mp4 --lang en --model small --out hasil

Hasil (default di sebelah file input, nama dasar sama):
  <nama>.words.json  daftar kata: {"word", "start", "end", "prob"} -> dasar animasi karaoke
  <nama>.srt         subtitle 2-4 kata per baris (aturan guidebook)
  <nama>.txt         teks polos
"""
import argparse
import json
import os
import pathlib
import sys
import time

# DLL CUDA (cuBLAS/cuDNN) dari paket pip nvidia-* harus kelihatan sebelum ctranslate2 dimuat
_nv = pathlib.Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
for sub in ("cublas", "cudnn"):
    d = _nv / sub / "bin"
    if d.is_dir():
        os.environ["PATH"] = str(d) + os.pathsep + os.environ["PATH"]
        os.add_dll_directory(str(d))

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

import shutil  # noqa: E402
import subprocess  # noqa: E402

import numpy as np  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402
import ctranslate2  # noqa: E402


def find_ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    # winget menambah PATH, tapi terminal lama belum melihatnya
    pk = pathlib.Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    hits = sorted(pk.glob("Gyan.FFmpeg*/*/bin/ffmpeg.exe")) if pk.is_dir() else []
    if hits:
        return str(hits[-1])
    sys.exit("ffmpeg tidak ditemukan. Pasang: winget install Gyan.FFmpeg")


def load_audio(path):
    """Decode audio apa pun lewat ffmpeg -> float32 mono 16 kHz (format yang diminta Whisper).
    Tidak memakai PyAV, yang API-nya sering berubah."""
    cmd = [find_ffmpeg(), "-nostdin", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        sys.exit(f"ffmpeg gagal membaca {path}:\n{res.stderr.decode(errors='replace')[-500:]}")
    audio = np.frombuffer(res.stdout, dtype=np.float32)
    if audio.size == 0:
        sys.exit(f"Tidak ada audio di {path}")
    return audio

MAX_WORDS = 4      # maksimal kata per baris subtitle; baris juga putus di tanda baca
GAP = 0.35       # jeda (detik) yang memutus baris


def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def chunks(words):
    line = []
    for i, w in enumerate(words):
        line.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        punct = w["word"].rstrip().endswith((".", ",", "?", "!", ":", ";"))
        gap = nxt is not None and nxt["start"] - w["end"] > GAP
        if nxt is None or len(line) >= MAX_WORDS or gap or punct:
            yield line
            line = []


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--lang", default="id", help="kode bahasa (id, en, ...) atau 'auto'")
    ap.add_argument("--model", default="large-v3-turbo", help="tiny/base/small/medium/large-v3/large-v3-turbo")
    ap.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    ap.add_argument("--out", help="folder hasil (default: di sebelah input)")
    a = ap.parse_args()

    src = pathlib.Path(a.input).resolve()
    if not src.exists():
        sys.exit(f"File tidak ada: {src}")
    out_dir = pathlib.Path(a.out).resolve() if a.out else src.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    base = out_dir / src.stem

    device = a.device
    if device == "auto":
        device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
    compute = "float16" if device == "cuda" else "int8"
    print(f"model {a.model} | {device} ({compute}) | bahasa {a.lang}")

    t0 = time.time()
    model = WhisperModel(a.model, device=device, compute_type=compute)
    segments, info = model.transcribe(
        load_audio(src),
        language=None if a.lang == "auto" else a.lang,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
    )
    words, text = [], []
    for seg in segments:
        text.append(seg.text.strip())
        for w in seg.words or []:
            words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3),
                          "prob": round(w.probability, 3)})
    took = time.time() - t0

    base.with_suffix(".words.json").write_text(json.dumps(
        {"source": src.name, "language": info.language, "duration": round(info.duration, 2),
         "model": a.model, "words": words}, ensure_ascii=False, indent=1), encoding="utf-8")
    base.with_suffix(".txt").write_text("\n".join(text) + "\n", encoding="utf-8")
    srt = []
    for n, line in enumerate(chunks(words), 1):
        srt.append(f"{n}\n{ts(line[0]['start'])} --> {ts(line[-1]['end'])}\n{' '.join(w['word'] for w in line)}\n")
    base.with_suffix(".srt").write_text("\n".join(srt), encoding="utf-8")

    low = [w["word"] for w in words if w["prob"] < 0.5]
    print(f"{len(words)} kata, {info.duration:.1f} s audio, selesai dalam {took:.1f} s")
    if low:
        print(f"cek manual ({len(low)} kata kurang yakin): {', '.join(low[:15])}{' ...' if len(low) > 15 else ''}")
    print(f"-> {base}.words.json / .srt / .txt")


if __name__ == "__main__":
    main()
