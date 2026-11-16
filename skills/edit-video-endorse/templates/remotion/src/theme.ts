// Token gaya "endorse". Ubah bersamaan dengan references/style.md dan THEME di build_hyperframes.py.
import type React from "react";

export const COLORS = {
  lime: "#C8F031",
  limeDark: "#B4DB22",
  ink: "#0B0B0C",
  paper: "#F3EFE6",
  paperDot: "#D6CFBE",
  navy: "#0E1A3A",
  white: "#FFFFFF",
  red: "#FF5A4E",
};

export const BG_CSS: Record<string, React.CSSProperties> = {
  ink: { backgroundColor: COLORS.ink, color: COLORS.white },
  lime: {
    backgroundColor: COLORS.lime,
    backgroundImage: `repeating-linear-gradient(135deg, ${COLORS.lime} 0 22px, ${COLORS.limeDark} 22px 44px)`,
    color: COLORS.ink,
  },
  paper: {
    backgroundColor: COLORS.paper,
    backgroundImage: `radial-gradient(${COLORS.paperDot} 3px, transparent 3.5px)`,
    backgroundSize: "28px 28px",
    color: COLORS.ink,
  },
  navy: {
    backgroundColor: COLORS.navy,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.08) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.08) 2px, transparent 2px)",
    backgroundSize: "60px 60px",
    color: COLORS.white,
  },
  split: { backgroundColor: COLORS.ink, color: COLORS.white },
};

/** Ukuran yang bergantung pada orientasi kanvas (style.md §3 dan §8). */
export const layout = (width: number, height: number) => {
  const landscape = width > height;
  return landscape
    ? { landscape, subSize: 56, subY: 650, closeZoom: 1.25, titleY: 120, unit: 1080 / 1920 }
    : { landscape, subSize: 64, subY: 1250, closeZoom: 1.35, titleY: 300, unit: 1 };
};

export const SHADOW_SOFT = "0 6px 24px rgba(0,0,0,.45)";
