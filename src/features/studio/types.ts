export type StudioMode = "have_footage" | "need_footage";
export type StudioStage = "start" | "analyzing" | "directions" | "approved" | "building" | "ready" | "rendering" | "complete" | "error";

export interface StudioBeat {
  start: number;
  end: number;
  label: string;
  detail: string;
  opportunity: string;
}

export interface EditDirection {
  id: string;
  title: string;
  hook: string;
  angle: string;
  structure: string[];
}

export interface EdlScene {
  id: string;
  start: number;
  duration: number;
  sourceType: "video" | "image" | "color";
  sourceUrl?: string;
  sourceStart?: number;
  sourceEnd?: number;
  background?: string;
  fit: "cover" | "contain";
  zoomFrom: number;
  zoomTo: number;
  panX?: number;
  panY?: number;
  transition?: "cut" | "fade";
}

export interface EdlCaption {
  id: string;
  start: number;
  end: number;
  text: string;
  size: number;
  position: "top" | "center" | "bottom";
  emphasis?: string;
}

export interface EdlOverlay {
  id: string;
  start: number;
  end: number;
  type: "text" | "shape" | "image";
  text?: string;
  imageUrl?: string;
  x: number;
  y: number;
  width?: number;
  size?: number;
}

export interface EdlAudio {
  id: string;
  start: number;
  end: number;
  url: string;
  volume: number;
  label: string;
}

export interface StudioEdl {
  version: 1;
  revision: number;
  title: string;
  fps: 30;
  width: 1080;
  height: 1920;
  duration: number;
  background: string;
  scenes: EdlScene[];
  captions: EdlCaption[];
  overlays: EdlOverlay[];
  audio: EdlAudio[];
}

export interface StudioMessage {
  id: string;
  role: "user" | "assistant" | "status";
  kind: "text" | "beats" | "directions" | "approval" | "status" | "error";
  content: string;
  payload?: unknown;
}
