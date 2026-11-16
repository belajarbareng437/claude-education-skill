"""Bangun ZIP skill untuk diunggah ke Claude Desktop / claude.ai (Customize > Skills > Upload a skill).

Pemakaian (dari root repo):  python tools/build_desktop_zip.py
Hasil:                       dist/edukasi-video-endorse.zip

Kenapa perlu ZIP terpisah dari skill Claude Code?
- Unggahan skill di aplikasi Claude membatasi deskripsi maks. 200 karakter (Claude Code tidak).
- Nama skill yang memuat kata "claude"/"anthropic" bisa ditolak, jadi di Desktop namanya "edukasi-video-endorse".
- Folder di dalam ZIP harus sama dengan nama skill dan berada di akar ZIP.
- node_modules, out/ dan file sementara tidak ikut.
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "skills", "claude-education-skill")
NAME = "edukasi-video-endorse"
DESCRIPTION = (
    "Edit video talking-head jadi video tips vertikal gaya endorse (aksen lime, subtitle gaya Apple, "
    "infografis layar penuh, SFX) dan render dengan Remotion atau HyperFrames."
)
SKIP_DIRS = {"node_modules", "out", "__pycache__", ".remotion", "stills"}
SKIP_FILES = {".DS_Store", "Thumbs.db"}


def desktop_skill_md(text):
    m = re.match(r"^---\n(.*?)\n---\n", text.replace("\r\n", "\n"), re.S)
    if not m:
        sys.exit("SKILL.md tidak punya frontmatter")
    body = text.replace("\r\n", "\n")[m.end():]
    front = f"---\nname: {NAME}\ndescription: {DESCRIPTION}\n---\n"
    return front + body


def main():
    assert len(DESCRIPTION) <= 200, f"deskripsi {len(DESCRIPTION)} karakter, maks 200"
    assert len(NAME) <= 64
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    out = os.path.join(ROOT, "dist", f"{NAME}.zip")
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, dirnames, filenames in os.walk(SRC):
            dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
            for fn in sorted(filenames):
                if fn in SKIP_FILES or fn.endswith(".pyc"):
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, SRC).replace(os.sep, "/")
                arc = f"{NAME}/{rel}"
                if rel == "SKILL.md":
                    with open(full, encoding="utf-8") as f:
                        z.writestr(arc, desktop_skill_md(f.read()))
                else:
                    z.write(full, arc)
                count += 1
    print(f"{count} file -> {out} ({os.path.getsize(out) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
