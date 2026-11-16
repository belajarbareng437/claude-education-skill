"""Bangun ZIP skill untuk diunggah ke Claude Desktop / claude.ai (Customize > Skills > Upload a skill).

Pemakaian (dari root repo):  python tools/build_desktop_zip.py
Hasil:                       dist/education-skill.zip, dist/icon-skill.zip

Kenapa perlu ZIP terpisah dari skill Claude Code?
- Unggahan skill di aplikasi Claude membatasi deskripsi maks. 200 karakter (Claude Code tidak),
  jadi frontmatter diganti dengan deskripsi pendek di bawah. Nama skill tetap sama.
- Folder di dalam ZIP harus sama dengan nama skill dan berada di akar ZIP.
- node_modules, out/ dan file sementara tidak ikut.
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKILLS = {
    "education-skill": (
        "Edit video talking-head jadi video tips vertikal gaya endorse (aksen lime, subtitle gaya Apple, "
        "infografis layar penuh, SFX) dan render dengan Remotion atau HyperFrames."
    ),
    "icon-skill": (
        "Edit video talking-head vertikal gaya cyan: kata kunci besar bergradasi cyan, kotak ikon emoji, "
        "cutaway hitam berikon, punch-in zoom, rekap pill ber-ikon, CTA. Cocok untuk konten lemah vs kuat."
    ),
}
SKIP_DIRS = {"node_modules", "out", "__pycache__", ".remotion", "stills", "build", "shots"}
SKIP_FILES = {".DS_Store", "Thumbs.db"}


def desktop_skill_md(text, name, description):
    text = text.replace("\r\n", "\n")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        sys.exit(f"{name}/SKILL.md tidak punya frontmatter")
    return f"---\nname: {name}\ndescription: {description}\n---\n" + text[m.end():]


def build(name, description):
    assert len(description) <= 200, f"{name}: deskripsi {len(description)} karakter, maks 200"
    assert len(name) <= 64
    src = os.path.join(ROOT, "skills", name)
    out = os.path.join(ROOT, "dist", f"{name}.zip")
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, dirnames, filenames in os.walk(src):
            dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
            for fn in sorted(filenames):
                if fn in SKIP_FILES or fn.endswith(".pyc"):
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, src).replace(os.sep, "/")
                arc = f"{name}/{rel}"
                if rel == "SKILL.md":
                    with open(full, encoding="utf-8") as f:
                        z.writestr(arc, desktop_skill_md(f.read(), name, description))
                else:
                    z.write(full, arc)
                count += 1
    print(f"{name}: {count} file -> {out} ({os.path.getsize(out) / 1024:.0f} KB)")


def main():
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    names = sys.argv[1:] or list(SKILLS)
    for n in names:
        if n not in SKILLS:
            sys.exit(f"skill tidak dikenal: {n} (tersedia: {', '.join(SKILLS)})")
        build(n, SKILLS[n])


if __name__ == "__main__":
    main()
