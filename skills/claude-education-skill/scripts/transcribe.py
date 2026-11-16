"""Transkripsi dengan timestamp per kata (faster-whisper).

Pemakaian:
  python -I transcribe.py <video_atau_audio> <words.json> [--lang id] [--model small]
                          [--prompt "topik, nama merek, nama channel"]

Hasil words.json:
  {"language": "id", "words": [{"text": "Halo", "start": 0.42, "end": 0.70}, ...],
   "segments": [{"start": .., "end": .., "text": ".."}]}
"""
import argparse
import json
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--lang", default="id")
    ap.add_argument("--model", default="small")
    ap.add_argument("--prompt", default="", help="istilah/nama agar whisper tidak salah dengar")
    ap.add_argument("--device", default="auto")
    a = ap.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper belum terpasang: pip install faster-whisper")

    compute = "int8"
    model = WhisperModel(a.model, device=a.device, compute_type=compute)
    segments, info = model.transcribe(
        a.src,
        language=a.lang or None,
        word_timestamps=True,
        vad_filter=True,
        initial_prompt=a.prompt or None,
    )

    words, segs = [], []
    for seg in segments:
        segs.append({"start": round(seg.start, 3), "end": round(seg.end, 3), "text": seg.text.strip()})
        for w in seg.words or []:
            text = w.word.strip()
            if text:
                words.append({"text": text, "start": round(w.start, 3), "end": round(w.end, 3)})
        print(f"[{seg.start:6.2f}] {seg.text.strip()}")

    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"language": info.language, "words": words, "segments": segs}, f, ensure_ascii=False, indent=1)
    print(f"\n{len(words)} kata -> {a.out}")


if __name__ == "__main__":
    main()
