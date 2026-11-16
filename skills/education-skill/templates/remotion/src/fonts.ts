import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBodoni } from "@remotion/google-fonts/BodoniModa";

const inter = loadInter("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
const bodoni = loadBodoni("normal", { weights: ["500"], subsets: ["latin"] });

/** Nama keluarga huruf "SubtitleFont" dimuat dari timeline.subtitleFont (mis. Coolvetica) bila ada. */
export const SUBTITLE_FAMILY = "SubtitleFont";

export const FONTS = {
  inter: inter.fontFamily,
  serif: bodoni.fontFamily,
  // Cadangan Inter bila Coolvetica tidak dipasang.
  subtitle: `${SUBTITLE_FAMILY}, ${inter.fontFamily}`,
};
