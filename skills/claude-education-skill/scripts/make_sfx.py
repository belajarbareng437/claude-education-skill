"""Buat SFX sintetis (whoosh, pop, tick) — tanpa dependensi, tanpa lisensi pihak ketiga.

Pemakaian: python -I make_sfx.py <folder_tujuan>
"""
import math
import os
import random
import struct
import sys
import wave

SR = 48000


def write(path, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = 0.89 / peak
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * scale)) * 32767)) for s in samples))


def whoosh(dur=0.45):
    rnd = random.Random(7)
    n = int(SR * dur)
    out, lp, bp = [], 0.0, 0.0
    for i in range(n):
        t = i / n
        env = math.sin(math.pi * min(1, t / 0.55) / 2) ** 2 * (1 - max(0, (t - 0.55) / 0.45)) ** 2
        cutoff = 300 + 5200 * math.sin(math.pi * t) ** 1.5           # sapuan frekuensi
        a = 1 - math.exp(-2 * math.pi * cutoff / SR)
        x = rnd.uniform(-1, 1)
        lp += a * (x - lp)
        bp += 0.15 * (lp - bp)                                           # buang sebagian bass
        out.append((lp - bp) * env)
    return out


def pop(dur=0.11):
    n = int(SR * dur)
    out, ph = [], 0.0
    for i in range(n):
        t = i / SR
        f = 260 + 520 * math.exp(-t * 45)
        ph += 2 * math.pi * f / SR
        env = (1 - math.exp(-t * 900)) * math.exp(-t * 38)
        out.append(math.sin(ph) * env)
    return out


def tick(dur=0.035):
    rnd = random.Random(3)
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-t * 180)
        out.append((0.7 * math.sin(2 * math.pi * 2400 * t) + 0.3 * rnd.uniform(-1, 1)) * env)
    return out


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    folder = sys.argv[1]
    os.makedirs(folder, exist_ok=True)
    for name, fn in (("whoosh", whoosh), ("pop", pop), ("tick", tick)):
        path = os.path.join(folder, f"{name}.wav")
        write(path, fn())
        print("->", path)


if __name__ == "__main__":
    main()
