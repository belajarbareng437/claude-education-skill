import React from "react";
import { Easing, interpolate } from "remotion";
import ICONS from "../icons.json";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);

/** 0→1 selama `dur` detik mulai `delay` detik (frame lokal). */
export const prog = (frame: number, fps: number, delay: number, dur: number, easing = easeOut) =>
  interpolate(frame, [delay * fps, (delay + dur) * fps], [0, 1], { ...clamp, easing });

/** clip-path wipe: masuk dari bawah, keluar ke atas (style.md §6). */
export const wipeClip = (frame: number, fps: number, total: number, enter = 0.35, exit = 0.3) => {
  const p = prog(frame, fps, 0, enter, easeInOut);
  const q = interpolate(frame, [total - exit * fps, total], [0, 1], { ...clamp, easing: easeInOut });
  return `inset(${(1 - p) * 100}% 0 ${q * 100}% 0)`;
};

export const Icon: React.FC<{ name: string; size: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({
  name,
  size,
  color = "#fff",
  stroke = 2,
  style,
}) => {
  const d = (ICONS as Record<string, string>)[name] ?? ICONS.star;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
