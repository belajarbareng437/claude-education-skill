"""Cek alat yang dibutuhkan icon-skill.

Pemakaian: python -I doctor.py
"""
import importlib.util
import os
import shutil
import subprocess
import sys

OK, BAD = "OK ", "!! "


def first_line(cmd):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return ((out.stdout or out.stderr).strip().splitlines() or ["?"])[0]
    except Exception as exc:  # noqa: BLE001
        return f"gagal dijalankan ({exc})"


def find_chrome():
    if os.environ.get("CHROME_PATH") and os.path.exists(os.environ["CHROME_PATH"]):
        return os.environ["CHROME_PATH"]
    for n in ("chrome", "google-chrome", "google-chrome-stable", "chromium"):
        p = shutil.which(n)
        if p:
            return p
    for p in (
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "Application", "chrome.exe"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ):
        if os.path.exists(p):
            return p
    return None


def main():
    bad = 0
    if sys.version_info >= (3, 10):
        print(f"{OK}Python {sys.version.split()[0]} ({sys.executable})")
    else:
        print(f"{BAD}Python >= 3.10 dibutuhkan")
        bad += 1

    node = shutil.which("node")
    if node:
        v = first_line([node, "--version"])
        try:
            ok = int(v.lstrip("v").split(".")[0]) >= 22
        except ValueError:
            ok = True
        print(f"{OK if ok else BAD}node {v}" + ("" if ok else " — butuh 22 atau lebih baru"))
        bad += not ok
    else:
        print(f"{BAD}node tidak ditemukan — https://nodejs.org (Windows: winget install OpenJS.NodeJS.LTS · macOS: brew install node)")
        bad += 1

    for name in ("ffmpeg", "ffprobe"):
        p = shutil.which(name)
        if p:
            print(f"{OK}{name}: {first_line([p, '-version'])[:70]}")
        else:
            print(f"{BAD}{name} tidak ditemukan — Windows: winget install Gyan.FFmpeg · macOS: brew install ffmpeg")
            bad += 1

    chrome = find_chrome()
    if chrome:
        print(f"{OK}Chrome: {chrome}")
    else:
        print(f"{BAD}Google Chrome tidak ditemukan — pasang dari https://www.google.com/chrome atau set env CHROME_PATH")
        bad += 1

    for mod, pkg, why in (("cv2", "opencv-python", "pelacak dagu (wajib untuk render)"),
                          ("faster_whisper", "faster-whisper", "transkripsi")):
        if importlib.util.find_spec(mod):
            print(f"{OK}{pkg} terpasang")
        else:
            print(f"{BAD}{pkg} belum terpasang — pip install {pkg}  ({why})")
            bad += 1
    if os.environ.get("PYTHON"):
        print(f"   (render.mjs akan memakai PYTHON={os.environ['PYTHON']})")

    print()
    print("Semua siap." if not bad else f"{bad} hal perlu dibereskan dulu.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
