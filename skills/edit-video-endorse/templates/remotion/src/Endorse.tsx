import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import type { Scene, Sfx, Timeline } from "./types";
import { COLORS, layout } from "./theme";
import { FONTS, SUBTITLE_FAMILY } from "./fonts";
import { Subtitles } from "./components/Subtitles";
import { FloatIcons, PointTitle, SerifCard } from "./components/Cards";
import { BRoll, Fullscreen, Sheet } from "./components/Fullscreen";

export type EndorseProps = { timelineFile: string; timeline: Timeline | null };

/** Video utama dengan framing lebar/close-up bergantian (potong, bukan zoom pelan). */
const MainVideo: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const f = (tl.framing ?? []).find((x) => t >= x.start && t < x.end);
  const zoom = f?.zoom ?? 1;
  const focusY = f?.focusY ?? 0.35;

  if (!tl.video) {
    // Mode demo tanpa video: latar abu gelap supaya elemen grafis terlihat.
    return <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 35%, #3a3d44, #121316)" }} />;
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      <OffthreadVideo
        src={staticFile(tl.video)}
        style={{
          width,
          height,
          objectFit: "cover",
          transform: `scale(${zoom})`,
          transformOrigin: `50% ${focusY * 100}%`,
        }}
      />
      {/* Gradasi tipis di bawah agar subtitle putih tetap terbaca */}
      <AbsoluteFill style={{ background: `linear-gradient(transparent ${layout(width, height).landscape ? 55 : 55}%, rgba(0,0,0,.35))` }} />
    </AbsoluteFill>
  );
};

const autoSfx = (scenes: Scene[]): Sfx[] => {
  const out: Sfx[] = [];
  for (const s of scenes) {
    if (s.type === "pointTitle" || s.type === "floatIcons") out.push({ t: s.start, kind: "pop", volume: 0.6 });
    else out.push({ t: s.start, kind: "whoosh", volume: 0.55 });
    if (s.type === "fullscreen" && s.content.kind === "count") out.push({ t: s.start + 1.3, kind: "tick", volume: 0.6 });
    if (s.type === "fullscreen" && s.content.kind === "toggle") out.push({ t: s.start + 0.85, kind: "tick", volume: 0.6 });
  }
  return out;
};

const SceneView: React.FC<{ s: Scene; total: number }> = ({ s, total }) => {
  switch (s.type) {
    case "serifCard":
      return <SerifCard kicker={s.kicker} title={s.title} highlight={s.highlight} total={total} />;
    case "pointTitle":
      return <PointTitle number={s.number} title={s.title} icons={s.icons} total={total} />;
    case "floatIcons":
      return <FloatIcons icons={s.icons} total={total} />;
    case "fullscreen":
      return <Fullscreen bg={s.bg} content={s.content} total={total} />;
    case "sheet":
      return <Sheet title={s.title} rows={s.rows} total={total} />;
    case "broll":
      return <BRoll src={s.src} total={total} />;
    default:
      return null;
  }
};

/** Muat font subtitle sendiri (mis. Coolvetica) dari public/ bila timeline.subtitleFont diisi. */
const useSubtitleFont = (path?: string) => {
  const [handle] = useState(() => (path ? delayRender("font subtitle") : null));
  useEffect(() => {
    if (!path || handle === null) return;
    loadFont({ family: SUBTITLE_FAMILY, url: staticFile(path), weight: "700" })
      .then(() => continueRender(handle))
      .catch((e) => cancelRender(e));
  }, [path, handle]);
};

export const Endorse: React.FC<EndorseProps> = ({ timeline }) => {
  const { fps } = useVideoConfig();
  useSubtitleFont(timeline?.subtitleFont);
  if (!timeline) return <AbsoluteFill style={{ background: COLORS.ink }} />;

  const scenes = [...timeline.scenes].sort((a, b) => a.start - b.start);
  // Subtitle disembunyikan saat layar tertutup grafis besar.
  const hidden: [number, number][] = scenes
    .filter((s) => s.type === "serifCard" || s.type === "fullscreen" || s.type === "sheet" || (s.type === "broll" && timeline.width < timeline.height))
    .map((s) => [s.start, s.end]);
  const sfx = timeline.sfx && timeline.sfx.length ? timeline.sfx : autoSfx(scenes);
  // Urutan lapisan: video → ikon/judul → subtitle → infografis/kartu (menutupi semuanya).
  const order = (s: Scene) => (s.type === "fullscreen" || s.type === "serifCard" ? 2 : 0);

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: FONTS.inter }}>
      <MainVideo tl={timeline} />
      {scenes
        .filter((s) => order(s) === 0)
        .map((s, i) => {
          const total = Math.max(1, Math.round((s.end - s.start) * fps));
          return (
            <Sequence key={`a${i}`} from={Math.round(s.start * fps)} durationInFrames={total} premountFor={fps}>
              <SceneView s={s} total={total} />
            </Sequence>
          );
        })}
      <Subtitles captions={timeline.captions} hidden={hidden} font={FONTS.subtitle} />
      {scenes
        .filter((s) => order(s) === 2)
        .map((s, i) => {
          const total = Math.max(1, Math.round((s.end - s.start) * fps));
          return (
            <Sequence key={`b${i}`} from={Math.round(s.start * fps)} durationInFrames={total} premountFor={fps}>
              <SceneView s={s} total={total} />
            </Sequence>
          );
        })}
      {sfx.map((x, i) => (
        <Sequence key={`s${i}`} from={Math.max(0, Math.round(x.t * fps))} durationInFrames={Math.round(fps * 0.6)} layout="none">
          <Audio src={staticFile(`sfx/${x.kind}.wav`)} volume={x.volume ?? 0.6} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
