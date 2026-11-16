import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { Endorse, EndorseProps } from "./Endorse";
import type { Timeline } from "./types";

// Ukuran, fps dan durasi diambil dari public/timeline.json — ganti isi video tanpa mengubah kode.
const calculateMetadata: CalculateMetadataFunction<EndorseProps> = async ({ props }) => {
  const res = await fetch(staticFile(props.timelineFile));
  if (!res.ok) throw new Error(`Tidak bisa membaca public/${props.timelineFile}`);
  const timeline = (await res.json()) as Timeline;

  const lastCap = timeline.captions.length ? timeline.captions[timeline.captions.length - 1].end : 0;
  const lastScene = Math.max(0, ...timeline.scenes.map((s) => s.end));
  const duration = timeline.duration ?? Math.max(lastCap + 0.5, lastScene, 1);

  return {
    durationInFrames: Math.max(1, Math.round(duration * timeline.fps)),
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
    props: { ...props, timeline },
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Endorse"
    component={Endorse}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ timelineFile: "timeline.json", timeline: null } as EndorseProps}
    calculateMetadata={calculateMetadata}
  />
);
