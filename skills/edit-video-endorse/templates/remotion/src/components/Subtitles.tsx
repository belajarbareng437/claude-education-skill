import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "../types";
import { layout, SHADOW_SOFT } from "../theme";
import { prog } from "./anim";

/** Satu tampilan 2–3 kata; tiap kata muncul sendiri saat diucapkan (fade + naik 14 px + blur→tajam). */
const CaptionView: React.FC<{ cap: Caption; font: string }> = ({ cap, font }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const outP = prog(frame, fps, cap.end - cap.start - 0.08, 0.08);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: L.subY,
          transform: "translateY(-50%)",
          textAlign: "center",
          fontFamily: font,
          fontWeight: 700,
          fontSize: L.subSize,
          lineHeight: 1.15,
          color: "#fff",
          textShadow: SHADOW_SOFT,
          opacity: 1 - outP,
        }}
      >
        {cap.words.map((w, i) => {
          const p = prog(frame, fps, Math.max(0, w.start - cap.start), 0.18);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: i < cap.words.length - 1 ? "0.26em" : 0,
                opacity: p,
                transform: `translateY(${(1 - p) * 14}px)`,
                filter: `blur(${(1 - p) * 8}px)`,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Subtitles: React.FC<{ captions: Caption[]; hidden: [number, number][]; font: string }> = ({
  captions,
  hidden,
  font,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {captions
        .filter((c) => {
          const mid = (c.start + c.end) / 2;
          return !hidden.some(([s, e]) => mid >= s && mid <= e);
        })
        .map((c, i) => (
          <Sequence
            key={i}
            from={Math.round(c.start * fps)}
            durationInFrames={Math.max(1, Math.round((c.end - c.start) * fps))}
            layout="none"
          >
            <CaptionView cap={c} font={font} />
          </Sequence>
        ))}
    </>
  );
};
