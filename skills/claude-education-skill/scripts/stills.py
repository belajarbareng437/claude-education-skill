"""Ambil frame cek dari video hasil render.

Pemakaian: python -I stills.py <video.mp4> <folder> <detik> [<detik> ...]
Hasil: <folder>/s01.jpg, s02.jpg, ...
"""
import os
import subprocess
import sys


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    video, folder, times = sys.argv[1], sys.argv[2], [float(t) for t in sys.argv[3:]]
    os.makedirs(folder, exist_ok=True)
    for i, t in enumerate(times, 1):
        out = os.path.join(folder, f"s{i:02d}.jpg")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-q:v", "3", out], check=True)
        print(f"{t:7.2f} dtk -> {out}")


if __name__ == "__main__":
    main()
