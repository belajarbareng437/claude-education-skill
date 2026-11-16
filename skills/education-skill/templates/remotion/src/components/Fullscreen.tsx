import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Bg, FullscreenContent } from "../types";
import { BG_CSS, COLORS, layout } from "../theme";
import { FONTS } from "../fonts";
import { clamp, easeInOut, easeOut, Icon, prog, wipeClip } from "./anim";

const Title: React.FC<{ text?: string; color: string; frame: number; fps: number }> = ({ text, color, frame, fps }) =>
  text ? (
    <div
      style={{
        fontFamily: FONTS.inter,
        fontWeight: 700,
        fontSize: 58,
        color,
        marginBottom: 56,
        opacity: prog(frame, fps, 0.2, 0.3),
        transform: `translateY(${(1 - prog(frame, fps, 0.2, 0.3)) * 20}px)`,
      }}
    >
      {text}
    </div>
  ) : null;

const Count: React.FC<{ c: Extract<FullscreenContent, { kind: "count" }>; fg: string }> = ({ c, fg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0.3 * fps, 1.3 * fps], [0, 1], { ...clamp, easing: easeOut });
  const value = Math.round(c.value * p).toLocaleString("id-ID");
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: FONTS.inter, fontWeight: 800, fontSize: 260, lineHeight: 1, color: fg, letterSpacing: "-0.04em" }}>
        {c.prefix ?? ""}
        {value}
        <span style={{ color: fg === COLORS.ink ? COLORS.ink : COLORS.lime }}>{c.suffix ?? ""}</span>
      </div>
      {c.label ? (
        <div style={{ fontFamily: FONTS.inter, fontWeight: 600, fontSize: 52, marginTop: 30, color: fg, opacity: prog(frame, fps, 0.6, 0.3) }}>
          {c.label}
        </div>
      ) : null}
    </div>
  );
};

const MARK = {
  check: { icon: "check", color: COLORS.lime, onLime: COLORS.ink },
  cross: { icon: "cross", color: COLORS.red, onLime: COLORS.red },
  dot: { icon: "target", color: COLORS.lime, onLime: COLORS.ink },
} as const;

const List: React.FC<{ c: Extract<FullscreenContent, { kind: "list" }>; bg: Bg; fg: string }> = ({ c, bg, fg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: "100%" }}>
      <Title text={c.title} color={fg} frame={frame} fps={fps} />
      {c.rows.map((r, i) => {
        const p = prog(frame, fps, 0.35 + i * 0.12, 0.3);
        const m = MARK[r.mark ?? "check"];
        const color = bg === "lime" ? m.onLime : m.color;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 30,
              padding: "26px 34px",
              marginBottom: 22,
              borderRadius: 28,
              background: bg === "lime" || bg === "paper" ? "rgba(11,11,12,.07)" : "rgba(255,255,255,.08)",
              opacity: p,
              transform: `translateX(${(1 - p) * -40}px)`,
            }}
          >
            <Icon name={m.icon} size={64} color={color} stroke={3} />
            <div
              style={{
                fontFamily: FONTS.inter,
                fontWeight: 600,
                fontSize: 50,
                color: fg,
                textDecoration: r.mark === "cross" ? "line-through" : "none",
                textDecorationColor: "rgba(255,90,78,.7)",
              }}
            >
              {r.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Chips: React.FC<{ c: Extract<FullscreenContent, { kind: "chips" }>; fg: string }> = ({ c, fg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ textAlign: "center" }}>
      <Title text={c.title} color={fg} frame={frame} fps={fps} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
        {c.chips.map((t, i) => {
          const s = spring({ frame: frame - (0.3 + i * 0.12) * fps, fps, config: { damping: 12, stiffness: 180 } });
          const hi = c.highlight === i;
          return (
            <div
              key={i}
              style={{
                fontFamily: FONTS.inter,
                fontWeight: 700,
                fontSize: 50,
                padding: "22px 44px",
                borderRadius: 999,
                background: hi ? COLORS.lime : fg === COLORS.ink ? "rgba(11,11,12,.08)" : "rgba(255,255,255,.1)",
                color: hi ? COLORS.ink : fg,
                border: hi ? "none" : `2px solid ${fg === COLORS.ink ? "rgba(11,11,12,.2)" : "rgba(255,255,255,.25)"}`,
                transform: `scale(${s})`,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Toggle: React.FC<{ c: Extract<FullscreenContent, { kind: "toggle" }>; fg: string }> = ({ c, fg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = interpolate(frame, [0.7 * fps, 1.0 * fps], [0, 1], { ...clamp, easing: easeInOut });
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: FONTS.inter, fontWeight: 700, fontSize: 58, color: fg, marginBottom: 60 }}>{c.label}</div>
      <div
        style={{
          margin: "0 auto",
          width: 360,
          height: 190,
          borderRadius: 999,
          background: on > 0.5 ? COLORS.lime : "rgba(255,255,255,.18)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 15,
            left: 15 + on * 170,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,.3)",
          }}
        />
      </div>
      <div style={{ fontFamily: FONTS.inter, fontWeight: 700, fontSize: 64, marginTop: 50, color: on > 0.5 ? COLORS.lime : "rgba(255,255,255,.55)" }}>
        {on > 0.5 ? c.on ?? "Aktif" : c.off ?? "Mati"}
      </div>
    </div>
  );
};

const Split: React.FC<{ c: Extract<FullscreenContent, { kind: "split" }>; landscape: boolean }> = ({ c, landscape }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const half = (side: "left" | "right", i: number) => {
    const d = c[side];
    const p = prog(frame, fps, 0.25 + i * 0.25, 0.35);
    const dark = side === "left";
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: dark ? COLORS.ink : COLORS.lime,
          color: dark ? COLORS.white : COLORS.ink,
          textAlign: "center",
          padding: 60,
        }}
      >
        <div style={{ fontFamily: FONTS.inter, fontWeight: 600, fontSize: 40, letterSpacing: "0.18em", opacity: 0.7 }}>{d.title.toUpperCase()}</div>
        <div style={{ fontFamily: FONTS.inter, fontWeight: 800, fontSize: 92, marginTop: 24, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
          {d.text}
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ flexDirection: landscape ? "row" : "column" }}>
      {half("left", 0)}
      {half("right", 1)}
    </AbsoluteFill>
  );
};

/** Infografis layar penuh, wipe dari bawah (style.md §6). */
export const Fullscreen: React.FC<{ bg?: Bg; content: FullscreenContent; total: number }> = ({ bg = "ink", content, total }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const fg = bg === "lime" || bg === "paper" ? COLORS.ink : COLORS.white;

  return (
    <AbsoluteFill style={{ ...BG_CSS[bg], clipPath: wipeClip(frame, fps, total) }}>
      {content.kind === "split" ? (
        <Split c={content} landscape={L.landscape} />
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: L.landscape ? "0 260px" : "0 80px" }}>
          {content.kind === "count" && <Count c={content} fg={fg} />}
          {content.kind === "list" && <List c={content} bg={bg} fg={fg} />}
          {content.kind === "chips" && <Chips c={content} fg={fg} />}
          {content.kind === "toggle" && <Toggle c={content} fg={fg} />}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** Bottom-sheet putih di atas video yang diredupkan. */
export const Sheet: React.FC<{ title: string; rows: string[]; total: number }> = ({ title, rows, total }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const up = spring({ frame, fps, config: { damping: 16, stiffness: 140 } });
  const down = interpolate(frame, [total - 0.3 * fps, total], [0, 1], { ...clamp, easing: easeInOut });
  const y = (1 - up + down) * 100;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(0,0,0,.45)", opacity: Math.min(up, 1 - down) }} />
      <div
        style={{
          position: "absolute",
          left: L.landscape ? width * 0.55 : 0,
          right: 0,
          bottom: 0,
          minHeight: L.landscape ? height * 0.8 : height * 0.46,
          background: "#fff",
          borderRadius: "56px 56px 0 0",
          padding: "34px 70px 90px",
          transform: `translateY(${y}%)`,
          boxShadow: "0 -20px 60px rgba(0,0,0,.3)",
        }}
      >
        <div style={{ width: 120, height: 10, borderRadius: 10, background: "#DDD", margin: "0 auto 46px" }} />
        <div style={{ fontFamily: FONTS.inter, fontWeight: 800, fontSize: 60, color: COLORS.ink, marginBottom: 36 }}>{title}</div>
        {rows.map((r, i) => {
          const p = prog(frame, fps, 0.35 + i * 0.12, 0.3);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, padding: "22px 0", borderTop: i ? "2px solid #EEE" : "none", opacity: p }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: COLORS.lime, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="check" size={40} color={COLORS.ink} stroke={3} />
              </div>
              <div style={{ fontFamily: FONTS.inter, fontWeight: 600, fontSize: 48, color: COLORS.ink }}>{r}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** B-roll rekaman layar dalam kartu membulat. */
export const BRoll: React.FC<{ src: string; total: number }> = ({ src, total }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const up = spring({ frame, fps, config: { damping: 16, stiffness: 150 } });
  const down = interpolate(frame, [total - 0.3 * fps, total], [0, 1], { ...clamp, easing: easeInOut });
  const w = L.landscape ? 518 : width - 120;
  const h = L.landscape ? 920 : height * 0.62;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          width: w,
          height: h,
          left: L.landscape ? width - w - 80 : 60,
          top: L.landscape ? (height - h) / 2 : 230,
          borderRadius: 40,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          transform: `translateY(${(1 - up + down) * (height + 200)}px)`,
          background: "#000",
        }}
      >
        <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};
