import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BG_CSS, COLORS, layout } from "../theme";
import { clamp, easeInOut, Icon, prog } from "./anim";
import { interpolate } from "remotion";
import { FONTS } from "../fonts";

/** Kartu serif pembuka/penutup di kertas bertitik (style.md §4). */
export const SerifCard: React.FC<{ kicker?: string; title: string; highlight?: string; total: number }> = ({
  kicker,
  title,
  highlight,
  total,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const fade = prog(frame, fps, 0, 0.25);
  const exit = interpolate(frame, [total - 0.3 * fps, total], [0, 1], { ...clamp, easing: easeInOut });
  const rise = prog(frame, fps, 0.05, 0.5);
  const mark = prog(frame, fps, 0.35, 0.45);

  const parts = highlight ? title.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i")) : [title];

  return (
    <AbsoluteFill
      style={{
        ...BG_CSS.paper,
        opacity: fade,
        clipPath: `inset(0 0 ${exit * 100}% 0)`,
        alignItems: "center",
        justifyContent: "center",
        padding: L.landscape ? "0 240px" : "0 90px",
        textAlign: "center",
      }}
    >
      {kicker ? (
        <div
          style={{
            fontFamily: FONTS.inter,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: "0.22em",
            color: "rgba(11,11,12,.6)",
            marginBottom: 36,
            opacity: rise,
          }}
        >
          {kicker.toUpperCase()}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: FONTS.serif,
          fontWeight: 500,
          fontSize: L.landscape ? 104 : 112,
          lineHeight: 1.08,
          color: COLORS.ink,
          transform: `translateY(${(1 - rise) * 30}px)`,
          opacity: rise,
        }}
      >
        {parts.map((p, i) =>
          highlight && p.toLowerCase() === highlight.toLowerCase() ? (
            <span
              key={i}
              style={{
                backgroundImage: `linear-gradient(${COLORS.lime}, ${COLORS.lime})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${mark * 100}% 42%`,
                backgroundPosition: "0 82%",
                padding: "0 6px",
              }}
            >
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Ikon garis di dalam lingkaran kaca, mengapung naik-turun. */
const Floating: React.FC<{ name: string; x: number; y: number; delay: number; size?: number }> = ({ name, x, y, delay, size = 120 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay * fps, fps, config: { damping: 11, stiffness: 160 } });
  const bob = Math.sin((frame / fps) * 2.4 + delay * 9) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size * 0.8,
        top: y - size * 0.8 + bob,
        width: size * 1.6,
        height: size * 1.6,
        borderRadius: "50%",
        background: "rgba(255,255,255,.16)",
        border: "1.5px solid rgba(255,255,255,.35)",
        backdropFilter: "blur(18px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${s})`,
        boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      }}
    >
      <Icon name={name} size={size} stroke={1.6} />
    </div>
  );
};

/** Judul poin pil kaca + nomor lime + 3 ikon mengapung (style.md §5). */
export const PointTitle: React.FC<{ number: number; title: string; icons?: string[]; total: number }> = ({
  number,
  title,
  icons = [],
  total,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 170 } });
  const out = interpolate(frame, [total - 0.25 * fps, total], [1, 0], clamp);
  const cx = width / 2;
  const iconY = L.titleY + (L.landscape ? 190 : 230);
  const spread = L.landscape ? 260 : 300;

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: "absolute",
          top: L.titleY,
          left: "50%",
          transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * s})`,
          opacity: Math.min(1, s * 1.4),
          display: "flex",
          alignItems: "center",
          gap: 26,
          padding: "16px 44px 16px 16px",
          borderRadius: 999,
          background: "rgba(255,255,255,.16)",
          border: "1.5px solid rgba(255,255,255,.35)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 10px 40px rgba(0,0,0,.25)",
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: COLORS.lime,
            color: COLORS.ink,
            fontFamily: FONTS.inter,
            fontWeight: 800,
            fontSize: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {number}
        </div>
        <div style={{ fontFamily: FONTS.subtitle, fontWeight: 700, fontSize: 54, color: "#fff" }}>{title}</div>
      </div>
      {icons.slice(0, 3).map((n, i) => (
        <Floating key={i} name={n} x={cx + (i - 1) * spread} y={iconY + (i === 1 ? 40 : 0)} delay={0.15 + i * 0.08} size={L.landscape ? 70 : 84} />
      ))}
    </AbsoluteFill>
  );
};

/** Ikon mengapung saat benda penting disebut. */
export const FloatIcons: React.FC<{ icons: string[]; total: number }> = ({ icons, total }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const out = interpolate(frame, [total - 0.25 * fps, total], [1, 0], clamp);
  const y = L.landscape ? 220 : 520;
  const xs = L.landscape ? [width * 0.72, width * 0.82, width * 0.92] : [width * 0.22, width * 0.5, width * 0.78];
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {icons.slice(0, 3).map((n, i) => (
        <Floating key={i} name={n} x={xs[i]} y={y + (i % 2) * 70} delay={i * 0.08} size={L.landscape ? 64 : 92} />
      ))}
    </AbsoluteFill>
  );
};
