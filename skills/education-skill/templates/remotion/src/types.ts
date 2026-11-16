export type Word = { text: string; start: number; end: number };
export type Caption = { start: number; end: number; words: Word[] };
export type Framing = { start: number; end: number; zoom: number; focusY?: number };

export type IconName = string;
export type Bg = "ink" | "lime" | "paper" | "navy" | "split";

export type CountContent = { kind: "count"; value: number; prefix?: string; suffix?: string; label?: string };
export type ListContent = {
  kind: "list";
  title?: string;
  rows: { text: string; mark?: "check" | "cross" | "dot" }[];
};
export type ChipsContent = { kind: "chips"; title?: string; chips: string[]; highlight?: number };
export type ToggleContent = { kind: "toggle"; label: string; off?: string; on?: string };
export type SplitContent = {
  kind: "split";
  left: { title: string; text: string };
  right: { title: string; text: string };
};
export type FullscreenContent = CountContent | ListContent | ChipsContent | ToggleContent | SplitContent;

type Base = { start: number; end: number };
export type Scene =
  | (Base & { type: "serifCard"; kicker?: string; title: string; highlight?: string })
  | (Base & { type: "pointTitle"; number: number; title: string; icons?: IconName[] })
  | (Base & { type: "floatIcons"; icons: IconName[] })
  | (Base & { type: "fullscreen"; bg?: Bg; content: FullscreenContent })
  | (Base & { type: "sheet"; title: string; rows: string[] })
  | (Base & { type: "broll"; src: string });

export type SfxKind = "whoosh" | "pop" | "tick";
export type Sfx = { t: number; kind: SfxKind; volume?: number };

export type Timeline = {
  width: number;
  height: number;
  fps: number;
  duration?: number;
  video?: string;
  subtitleFont?: string;
  glue?: string[];
  captions: Caption[];
  framing?: Framing[];
  scenes: Scene[];
  sfx?: Sfx[];
};
