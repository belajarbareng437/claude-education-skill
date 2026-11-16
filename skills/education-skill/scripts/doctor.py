"""Cek apakah alat yang dibutuhkan skill sudah terpasang.

Pemakaian: python -I doctor.py
"""
import importlib.util
import shutil
import subprocess
import sys

OK, BAD = "OK ", "!! "


def version(cmd):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=30, shell=False)
        return (out.stdout or out.stderr).strip().splitlines()[0]
    except Exception as exc:  # noqa: BLE001
        return f"gagal dijalankan ({exc})"


def main():
    problems = 0
    print(f"{OK}Python {sys.version.split()[0]}" if sys.version_info >= (3, 10) else f"{BAD}Python >= 3.10 dibutuhkan")
    problems += sys.version_info < (3, 10)

    for name, args, hint in [
        ("node", ["--version"], "pasang Node.js 22+ dari https://nodejs.org"),
        ("npm", ["--version"], "ikut terpasang bersama Node.js"),
        ("ffmpeg", ["-version"], "Windows: winget install Gyan.FFmpeg · macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg"),
        ("ffprobe", ["-version"], "ikut terpasang bersama ffmpeg"),
    ]:
        path = shutil.which(name)
        if not path:
            print(f"{BAD}{name} tidak ditemukan — {hint}")
            problems += 1
            continue
        v = version([path, *args])
        if name == "node":
            try:
                major = int(v.lstrip("v").split(".")[0])
                if major < 22:
                    print(f"{BAD}node {v} — butuh 22 atau lebih baru")
                    problems += 1
                    continue
            except ValueError:
                pass
        print(f"{OK}{name}: {v}")

    if importlib.util.find_spec("faster_whisper"):
        print(f"{OK}faster-whisper terpasang")
    else:
        print(f"{BAD}faster-whisper belum terpasang — pip install faster-whisper (hanya untuk transcribe.py)")
        problems += 1

    print()
    print("Semua siap." if problems == 0 else f"{problems} hal perlu dibereskan dulu.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
