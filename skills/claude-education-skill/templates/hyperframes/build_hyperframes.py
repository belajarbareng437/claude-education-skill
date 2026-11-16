"""Ubah timeline.json jadi komposisi HyperFrames (HTML + GSAP), gaya "endorse".

Pemakaian:
  python -I build_hyperframes.py <timeline.json> <index.html> [--no-audio-extract]

- Tulis index.html di folder proyek HyperFrames; aset (video, sfx/, broll/) harus berada di folder yang sama.
- SFX: bila folder sfx/ belum ada, dibuat otomatis (make_sfx.py).
- Suara narasi: diekstrak dari video ke <nama>.narasi.wav (butuh ffmpeg) agar video bisa dibisukan.
- Render: npx hyperframes lint . && npx hyperframes render -o out/video.mp4
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(os.path.dirname(HERE))
with open(os.path.join(SKILL, "templates", "remotion", "src", "icons.json"), encoding="utf-8") as _f:
    ICONS = json.load(_f)

# Sama dengan templates/remotion/src/theme.ts dan references/style.md
THEME = {
    "lime": "#C8F031", "limeDark": "#B4DB22", "ink": "#0B0B0C", "paper": "#F3EFE6",
    "paperDot": "#D6CFBE", "navy": "#0E1A3A", "white": "#FFFFFF", "red": "#FF5A4E",
}
GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"

e = html.escape


def icon(name, size, color="#fff", stroke=2):
    d = ICONS.get(name, ICONS["star"])
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24"><path d="{d}" fill="none" stroke="{color}" '
            f'stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def layout(w, h):
    if w > h:
        return dict(landscape=True, subSize=56, subY=650, closeZoom=1.25, titleY=120)
    return dict(landscape=False, subSize=64, subY=1250, closeZoom=1.35, titleY=300)


class Builder:
    def __init__(self, tl):
        self.tl = tl
        self.W, self.H = tl["width"], tl["height"]
        self.L = layout(self.W, self.H)
        self.html = []
        self.js = []
        self.uid = 0
        self.track = 0

    def id(self, p):
        self.uid += 1
        return f"{p}{self.uid}"

    def next_track(self):
        self.track += 1
        return self.track

    def clip(self, cls, start, end, inner, style=""):
        cid = self.id("c")
        self.html.append(
            f'<div id="{cid}" class="clip {cls}" data-start="{start:.3f}" data-duration="{max(0.04, end - start):.3f}" '
            f'data-track-index="{self.next_track()}" style="{style}">{inner}</div>')
        return cid

    # ---------- adegan ----------
    def wipe(self, cid, s, end):
        self.js.append(f'tl.fromTo("#{cid}",{{clipPath:"inset(100% 0 0% 0)"}},{{clipPath:"inset(0% 0 0% 0)",duration:.35,ease:"power2.inOut"}},{s:.3f});')
        self.js.append(f'tl.to("#{cid}",{{clipPath:"inset(0% 0 100% 0)",duration:.3,ease:"power2.inOut"}},{end - .3:.3f});')

    def serif_card(self, sc):
        s, end = sc["start"], sc["end"]
        title = e(sc["title"])
        hl = sc.get("highlight")
        if hl:
            title = re.sub(f"({re.escape(e(hl))})", r'<span class="hl">\1</span>', title, count=1, flags=re.I)
        kicker = f'<div class="kicker">{e(sc.get("kicker", "")).upper()}</div>' if sc.get("kicker") else ""
        cid = self.clip("full bg-paper serif", s, end, f'{kicker}<div class="serif-title">{title}</div>')
        self.js += [
            f'tl.fromTo("#{cid}",{{opacity:0}},{{opacity:1,duration:.25}},{s:.3f});',
            f'tl.fromTo("#{cid} .kicker, #{cid} .serif-title",{{opacity:0,y:30}},{{opacity:1,y:0,duration:.5,ease:"power3.out"}},{s + .05:.3f});',
            f'tl.fromTo("#{cid} .hl",{{backgroundSize:"0% 42%"}},{{backgroundSize:"100% 42%",duration:.45,ease:"power3.out"}},{s + .35:.3f});',
            f'tl.to("#{cid}",{{clipPath:"inset(0% 0 100% 0)",duration:.3,ease:"power2.inOut"}},{end - .3:.3f});',
        ]

    def floating(self, icons, positions, s, size):
        out = []
        for i, (name, (x, y)) in enumerate(zip(icons[:3], positions)):
            fid = self.id("f")
            out.append(f'<div id="{fid}" class="float" style="left:{x - size * .8:.0f}px;top:{y - size * .8:.0f}px;'
                       f'width:{size * 1.6:.0f}px;height:{size * 1.6:.0f}px">{icon(name, size, stroke=1.6)}</div>')
            d = .15 + i * .08
            self.js.append(f'tl.fromTo("#{fid}",{{scale:0}},{{scale:1,duration:.45,ease:"back.out(2)"}},{s + d:.3f});')
            self.js.append(f'tl.to("#{fid}",{{y:-6,duration:.65,ease:"sine.inOut",yoyo:true,repeat:5}},{s + d + .45:.3f});')
        return "".join(out)

    def point_title(self, sc):
        s, end, L = sc["start"], sc["end"], self.L
        size = 70 if L["landscape"] else 84
        spread = 260 if L["landscape"] else 300
        iy = L["titleY"] + (190 if L["landscape"] else 230)
        cx = self.W / 2
        pos = [(cx + (i - 1) * spread, iy + (40 if i == 1 else 0)) for i in range(3)]
        pill = (f'<div class="pill" style="top:{L["titleY"]}px"><div class="num">{sc["number"]}</div>'
                f'<div class="pill-title">{e(sc["title"])}</div></div>')
        floats = self.floating(sc.get("icons", []), pos, s, size)
        cid = self.clip("full", s, end, pill + floats)
        self.js += [
            f'tl.fromTo("#{cid} .pill",{{opacity:0,scale:.85}},{{opacity:1,scale:1,duration:.35,ease:"back.out(1.8)"}},{s:.3f});',
            f'tl.to("#{cid}",{{opacity:0,duration:.25}},{end - .25:.3f});',
        ]

    def float_icons(self, sc):
        s, end, L = sc["start"], sc["end"], self.L
        size = 64 if L["landscape"] else 92
        y = 220 if L["landscape"] else 520
        xs = [self.W * .72, self.W * .82, self.W * .92] if L["landscape"] else [self.W * .22, self.W * .5, self.W * .78]
        pos = [(xs[i], y + (i % 2) * 70) for i in range(3)]
        cid = self.clip("full", s, end, self.floating(sc["icons"], pos, s - .15, size))
        self.js.append(f'tl.to("#{cid}",{{opacity:0,duration:.25}},{end - .25:.3f});')

    def fullscreen(self, sc):
        s, end = sc["start"], sc["end"]
        bg = sc.get("bg", "ink")
        c = sc["content"]
        fg = THEME["ink"] if bg in ("lime", "paper") else THEME["white"]
        k = c["kind"]
        title = f'<div class="fs-title">{e(c["title"])}</div>' if c.get("title") else ""
        if k == "count":
            sfx_color = THEME["ink"] if fg == THEME["ink"] else THEME["lime"]
            inner = (f'<div class="center"><div class="count" style="color:{fg}">{e(c.get("prefix", ""))}<span class="num-var"></span>'
                     f'<span style="color:{sfx_color}">{e(c.get("suffix", ""))}</span></div>'
                     + (f'<div class="count-label">{e(c["label"])}</div>' if c.get("label") else "") + "</div>")
        elif k == "list":
            rows = []
            for r in c["rows"]:
                m = r.get("mark", "check")
                ic = {"check": "check", "cross": "cross", "dot": "target"}[m]
                col = (THEME["red"] if m == "cross" else THEME["ink"]) if bg == "lime" else (THEME["red"] if m == "cross" else THEME["lime"])
                cls = " strike" if m == "cross" else ""
                rows.append(f'<div class="row">{icon(ic, 64, col, 3)}<div class="row-text{cls}">{e(r["text"])}</div></div>')
            inner = f'<div class="block">{title}{"".join(rows)}</div>'
        elif k == "chips":
            chips = "".join(f'<div class="chip{" chip-hi" if c.get("highlight") == i else ""}">{e(t)}</div>' for i, t in enumerate(c["chips"]))
            inner = f'<div class="center">{title}<div class="chips">{chips}</div></div>'
        elif k == "toggle":
            inner = (f'<div class="center"><div class="fs-title">{e(c["label"])}</div><div class="tg"><div class="knob"></div></div>'
                     f'<div class="tg-state"><span class="off">{e(c.get("off", "Mati"))}</span><span class="on">{e(c.get("on", "Aktif"))}</span></div></div>')
        elif k == "split":
            inner = (f'<div class="split"><div class="half dark"><div class="half-k">{e(c["left"]["title"]).upper()}</div><div class="half-t">{e(c["left"]["text"])}</div></div>'
                     f'<div class="half lime"><div class="half-k">{e(c["right"]["title"]).upper()}</div><div class="half-t">{e(c["right"]["text"])}</div></div></div>')
        else:
            sys.exit(f"content.kind tidak dikenal: {k}")
        cid = self.clip(f"full bg-{bg} fs", s, end, inner, f"color:{fg}")
        self.wipe(cid, s, end)
        j = self.js
        j.append(f'tl.fromTo("#{cid} .fs-title",{{opacity:0,y:20}},{{opacity:1,y:0,duration:.3}},{s + .2:.3f});')
        if k == "count":
            j.append(f'tl.fromTo("#{cid} .num-var",{{"--num":0}},{{"--num":{int(c["value"])},duration:1,ease:"power3.out"}},{s + .3:.3f});')
            j.append(f'tl.fromTo("#{cid} .count-label",{{opacity:0}},{{opacity:1,duration:.3}},{s + .6:.3f});')
        elif k == "list":
            j.append(f'tl.fromTo("#{cid} .row",{{opacity:0,x:-40}},{{opacity:1,x:0,duration:.3,stagger:.12,ease:"power3.out"}},{s + .35:.3f});')
        elif k == "chips":
            j.append(f'tl.fromTo("#{cid} .chip",{{scale:0}},{{scale:1,duration:.4,stagger:.12,ease:"back.out(2)"}},{s + .3:.3f});')
        elif k == "toggle":
            j.append(f'tl.fromTo("#{cid} .knob",{{x:0}},{{x:170,duration:.3,ease:"power2.inOut"}},{s + .7:.3f});')
            j.append(f'tl.set("#{cid} .tg",{{backgroundColor:"{THEME["lime"]}"}},{s + .85:.3f});')
            j.append(f'tl.set("#{cid} .off",{{display:"none"}},{s + .85:.3f});')
            j.append(f'tl.set("#{cid} .on",{{display:"inline"}},{s + .85:.3f});')
        elif k == "split":
            j.append(f'tl.fromTo("#{cid} .half-t",{{opacity:0,y:24}},{{opacity:1,y:0,duration:.35,stagger:.25}},{s + .25:.3f});')

    def sheet(self, sc):
        s, end = sc["start"], sc["end"]
        rows = "".join(f'<div class="srow"><div class="sdot">{icon("check", 40, THEME["ink"], 3)}</div><div>{e(r)}</div></div>' for r in sc["rows"])
        inner = f'<div class="dim"></div><div class="sheet"><div class="grab"></div><div class="sheet-title">{e(sc["title"])}</div>{rows}</div>'
        cid = self.clip("full", s, end, inner)
        self.js += [
            f'tl.fromTo("#{cid} .dim",{{opacity:0}},{{opacity:1,duration:.3}},{s:.3f});',
            f'tl.fromTo("#{cid} .sheet",{{yPercent:100}},{{yPercent:0,duration:.5,ease:"back.out(1.1)"}},{s:.3f});',
            f'tl.fromTo("#{cid} .srow",{{opacity:0}},{{opacity:1,duration:.3,stagger:.12}},{s + .35:.3f});',
            f'tl.to("#{cid} .sheet",{{yPercent:100,duration:.3,ease:"power2.in"}},{end - .3:.3f});',
            f'tl.to("#{cid} .dim",{{opacity:0,duration:.3}},{end - .3:.3f});',
        ]

    def broll(self, sc):
        s, end, L = sc["start"], sc["end"], self.L
        w = 518 if L["landscape"] else self.W - 120
        h = 920 if L["landscape"] else self.H * .62
        x = self.W - w - 80 if L["landscape"] else 60
        y = (self.H - h) / 2 if L["landscape"] else 230
        vid = self.id("b")
        self.html.append(
            f'<video id="{vid}" class="clip broll" data-start="{s:.3f}" data-duration="{end - s:.3f}" data-track-index="{self.next_track()}" '
            f'src="{e(sc["src"])}" muted playsinline style="left:{x:.0f}px;top:{y:.0f}px;width:{w:.0f}px;height:{h:.0f}px"></video>')
        self.js += [
            f'tl.fromTo("#{vid}",{{y:{self.H + 200}}},{{y:0,duration:.5,ease:"back.out(1.1)"}},{s:.3f});',
            f'tl.to("#{vid}",{{y:{self.H + 200},duration:.3,ease:"power2.in"}},{end - .3:.3f});',
        ]

    def captions(self, hidden):
        L = self.L
        for c in self.tl.get("captions", []):
            mid = (c["start"] + c["end"]) / 2
            if any(a <= mid <= b for a, b in hidden):
                continue
            spans = "".join(f'<span class="w">{e(w["text"])}</span>' for w in c["words"])
            cid = self.id("s")
            self.html.append(
                f'<div id="{cid}" class="clip sub" data-start="{c["start"]:.3f}" data-duration="{c["end"] - c["start"]:.3f}" '
                f'data-track-index="{self.next_track()}" style="top:{L["subY"]}px;font-size:{L["subSize"]}px">{spans}</div>')
            for i, w in enumerate(c["words"]):
                self.js.append(
                    f'tl.fromTo("#{cid} .w:nth-child({i + 1})",{{opacity:0,y:14,filter:"blur(8px)"}},'
                    f'{{opacity:1,y:0,filter:"blur(0px)",duration:.18,ease:"power3.out"}},{max(c["start"], w["start"]):.3f});')

    # ---------- keseluruhan ----------
    def build(self, audio_src):
        tl, L = self.tl, self.L
        scenes = sorted(tl.get("scenes", []), key=lambda x: x["start"])
        dur = tl.get("duration") or max([c["end"] + .5 for c in tl.get("captions", [])] + [x["end"] for x in scenes] + [1])

        if tl.get("video"):
            self.html.append(
                f'<video id="main" class="clip" data-start="0" data-duration="{dur:.3f}" data-track-index="{self.next_track()}" '
                f'src="{e(tl["video"])}" muted playsinline style="position:absolute;left:0;top:0;width:{self.W}px;height:{self.H}px;object-fit:cover;transform-origin:50% 35%"></video>')
            self.html.append('<div class="shade"></div>')
            for f in tl.get("framing", []):
                self.js.append(f'tl.set("#main",{{scale:{f.get("zoom", L["closeZoom"])},transformOrigin:"50% {f.get("focusY", .35) * 100:.0f}%"}},{f["start"]:.3f});')
                self.js.append(f'tl.set("#main",{{scale:1}},{f["end"]:.3f});')
        else:
            self.html.append('<div class="demo-bg"></div>')

        back = [x for x in scenes if x["type"] not in ("fullscreen", "serifCard")]
        front = [x for x in scenes if x["type"] in ("fullscreen", "serifCard")]
        for sc in back:
            getattr(self, {"pointTitle": "point_title", "floatIcons": "float_icons", "sheet": "sheet", "broll": "broll"}[sc["type"]])(sc)
        hidden = [(x["start"], x["end"]) for x in scenes
                  if x["type"] in ("serifCard", "fullscreen", "sheet") or (x["type"] == "broll" and not L["landscape"])]
        self.captions(hidden)
        for sc in front:
            (self.serif_card if sc["type"] == "serifCard" else self.fullscreen)(sc)

        audio = []
        if audio_src:
            audio.append(f'<audio data-start="0" data-duration="{dur:.3f}" data-track-index="{self.next_track()}" data-volume="1" src="{e(audio_src)}"></audio>')
        for x in (tl.get("sfx") or self.auto_sfx(scenes)):
            audio.append(f'<audio data-start="{x["t"]:.3f}" data-duration="0.6" data-track-index="{self.next_track()}" '
                         f'data-volume="{x.get("volume", .6)}" src="sfx/{x["kind"]}.wav"></audio>')

        font_face = ""
        if tl.get("subtitleFont"):
            font_face = f'@font-face{{font-family:SubtitleFont;src:url("{e(tl["subtitleFont"])}");font-weight:700}}'
        css = CSS.replace("__W__", str(self.W)).replace("__H__", str(self.H)).replace("__FONTFACE__", font_face)
        for k, v in THEME.items():
            css = css.replace(f"__{k}__", v)
        css = css.replace("__TITLEPAD__", "0 260px" if L["landscape"] else "0 80px").replace("__SPLITDIR__", "row" if L["landscape"] else "column")
        css = css.replace("__SHEETLEFT__", f"{self.W * .55:.0f}px" if L["landscape"] else "0").replace("__SHEETMIN__", f"{self.H * (.8 if L['landscape'] else .46):.0f}px")

        body = "\n    ".join(self.html + audio)
        script = "\n      ".join(self.js)
        return f"""<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width={self.W}, height={self.H}">
  <title>Endorse video</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=Bodoni+Moda:wght@500&display=block" rel="stylesheet">
  <style>{css}</style>
</head>
<body>
  <div id="stage" data-composition-id="endorse" data-start="0" data-duration="{dur:.3f}" data-width="{self.W}" data-height="{self.H}">
    {body}
    <script src="{GSAP}"></script>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      {script}
      tl.set({{}}, {{}}, {dur:.3f});
      window.__timelines = window.__timelines || {{}};
      window.__timelines.endorse = tl;
    </script>
  </div>
</body>
</html>
"""

    @staticmethod
    def auto_sfx(scenes):
        out = []
        for s in scenes:
            out.append({"t": s["start"], "kind": "pop" if s["type"] in ("pointTitle", "floatIcons") else "whoosh", "volume": .6 if s["type"] in ("pointTitle", "floatIcons") else .55})
            if s["type"] == "fullscreen" and s["content"]["kind"] == "count":
                out.append({"t": s["start"] + 1.3, "kind": "tick", "volume": .6})
            if s["type"] == "fullscreen" and s["content"]["kind"] == "toggle":
                out.append({"t": s["start"] + .85, "kind": "tick", "volume": .6})
        return out


CSS = """
__FONTFACE__
@property --num { syntax: '<integer>'; inherits: false; initial-value: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: __W__px; height: __H__px; background: #000; overflow: hidden; }
#stage { position: relative; width: __W__px; height: __H__px; overflow: hidden; font-family: Inter, sans-serif; color: #fff; }
.clip { position: absolute; }
.full { left: 0; top: 0; width: __W__px; height: __H__px; }
.demo-bg { position: absolute; inset: 0; background: radial-gradient(circle at 50% 35%, #3a3d44, #121316); }
.shade { position: absolute; inset: 0; background: linear-gradient(transparent 55%, rgba(0,0,0,.35)); pointer-events: none; }
.bg-ink, .bg-split { background-color: __ink__; }
.bg-lime { background-color: __lime__; background-image: repeating-linear-gradient(135deg, __lime__ 0 22px, __limeDark__ 22px 44px); }
.bg-paper { background-color: __paper__; background-image: radial-gradient(__paperDot__ 3px, transparent 3.5px); background-size: 28px 28px; }
.bg-navy { background-color: __navy__; background-image: linear-gradient(rgba(255,255,255,.08) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.08) 2px, transparent 2px); background-size: 60px 60px; }
.serif { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: __TITLEPAD__; color: __ink__; }
.kicker { font-weight: 600; font-size: 34px; letter-spacing: .22em; color: rgba(11,11,12,.6); margin-bottom: 36px; }
.serif-title { font-family: 'Bodoni Moda', serif; font-weight: 500; font-size: 112px; line-height: 1.08; }
.hl { background-image: linear-gradient(__lime__, __lime__); background-repeat: no-repeat; background-size: 100% 42%; background-position: 0 82%; padding: 0 6px; }
.pill { position: absolute; left: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 26px; padding: 16px 44px 16px 16px; border-radius: 999px; background: rgba(255,255,255,.16); border: 1.5px solid rgba(255,255,255,.35); backdrop-filter: blur(18px); box-shadow: 0 10px 40px rgba(0,0,0,.25); white-space: nowrap; }
.num { width: 84px; height: 84px; border-radius: 50%; background: __lime__; color: __ink__; font-weight: 800; font-size: 44px; display: flex; align-items: center; justify-content: center; }
.pill-title { font-family: SubtitleFont, Inter, sans-serif; font-weight: 700; font-size: 54px; }
.float { position: absolute; border-radius: 50%; background: rgba(255,255,255,.16); border: 1.5px solid rgba(255,255,255,.35); backdrop-filter: blur(18px); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
.sub { left: 60px; right: 60px; width: calc(__W__px - 120px); transform: translateY(-50%); text-align: center; font-family: SubtitleFont, Inter, sans-serif; font-weight: 700; line-height: 1.15; text-shadow: 0 6px 24px rgba(0,0,0,.45); }
.sub .w { display: inline-block; margin-right: .26em; }
.sub .w:last-child { margin-right: 0; }
.fs { display: flex; align-items: center; justify-content: center; padding: __TITLEPAD__; }
.center { text-align: center; }
.block { width: 100%; }
.fs-title { font-weight: 700; font-size: 58px; margin-bottom: 56px; }
.count { font-weight: 800; font-size: 260px; line-height: 1; letter-spacing: -.04em; }
.num-var { counter-reset: n var(--num); }
.num-var::after { content: counter(n); }
.count-label { font-weight: 600; font-size: 52px; margin-top: 30px; }
.row { display: flex; align-items: center; gap: 30px; padding: 26px 34px; margin-bottom: 22px; border-radius: 28px; background: rgba(255,255,255,.08); }
.bg-lime .row, .bg-paper .row { background: rgba(11,11,12,.07); }
.row-text { font-weight: 600; font-size: 50px; }
.strike { text-decoration: line-through; text-decoration-color: rgba(255,90,78,.7); }
.chips { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; }
.chip { font-weight: 700; font-size: 50px; padding: 22px 44px; border-radius: 999px; background: rgba(255,255,255,.1); border: 2px solid rgba(255,255,255,.25); }
.bg-paper .chip, .bg-lime .chip { background: rgba(11,11,12,.08); border-color: rgba(11,11,12,.2); }
.chip.chip-hi { background: __lime__; color: __ink__; border: none; }
.tg { margin: 0 auto; width: 360px; height: 190px; border-radius: 999px; background: rgba(255,255,255,.18); position: relative; }
.knob { position: absolute; top: 15px; left: 15px; width: 160px; height: 160px; border-radius: 50%; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.tg-state { font-weight: 700; font-size: 64px; margin-top: 50px; }
.tg-state .off { color: rgba(255,255,255,.55); }
.tg-state .on { color: __lime__; display: none; }
.fs.bg-split { padding: 0; }
.split { position: absolute; inset: 0; display: flex; flex-direction: __SPLITDIR__; }
.half { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px; }
.half.dark { background: __ink__; color: #fff; }
.half.lime { background: __lime__; color: __ink__; }
.half-k { font-weight: 600; font-size: 40px; letter-spacing: .18em; opacity: .7; }
.half-t { font-weight: 800; font-size: 92px; margin-top: 24px; }
.dim { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
.sheet { position: absolute; left: __SHEETLEFT__; right: 0; bottom: 0; min-height: __SHEETMIN__; background: #fff; color: __ink__; border-radius: 56px 56px 0 0; padding: 34px 70px 90px; box-shadow: 0 -20px 60px rgba(0,0,0,.3); }
.grab { width: 120px; height: 10px; border-radius: 10px; background: #ddd; margin: 0 auto 46px; }
.sheet-title { font-weight: 800; font-size: 60px; margin-bottom: 36px; }
.srow { display: flex; align-items: center; gap: 26px; padding: 22px 0; font-weight: 600; font-size: 48px; }
.srow + .srow { border-top: 2px solid #eee; }
.sdot { width: 64px; height: 64px; border-radius: 50%; background: __lime__; display: flex; align-items: center; justify-content: center; }
.broll { border-radius: 40px; object-fit: cover; box-shadow: 0 30px 80px rgba(0,0,0,.45); background: #000; }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("timeline")
    ap.add_argument("out")
    ap.add_argument("--no-audio-extract", action="store_true")
    a = ap.parse_args()

    with open(a.timeline, encoding="utf-8") as f:
        tl = json.load(f)
    outdir = os.path.dirname(os.path.abspath(a.out))

    sfx_dir = os.path.join(outdir, "sfx")
    if not os.path.isdir(sfx_dir):
        subprocess.run([sys.executable, "-I", os.path.join(SKILL, "scripts", "make_sfx.py"), sfx_dir], check=True)

    audio_src = None
    if tl.get("video") and not a.no_audio_extract:
        stem = os.path.splitext(tl["video"])[0]
        audio_src = f"{stem}.narasi.wav"
        src_path, dst_path = os.path.join(outdir, tl["video"]), os.path.join(outdir, audio_src)
        if not os.path.exists(dst_path) or os.path.getmtime(dst_path) < os.path.getmtime(src_path):
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src_path, "-vn", "-ac", "2", "-ar", "48000", dst_path], check=True)

    doc = Builder(tl).build(audio_src)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"-> {a.out}")


if __name__ == "__main__":
    main()
