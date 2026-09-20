import type { EditDirection, StudioEdl } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function normalizeEdl(input: StudioEdl): StudioEdl {
  const duration = clamp(Number(input.duration) || 15, 1, 60);
  return {
    ...input,
    version: 1,
    fps: 30,
    width: 1080,
    height: 1920,
    duration,
    revision: Math.max(0, Math.floor(input.revision || 0)),
    scenes: (input.scenes || []).map((scene, index) => ({
      ...scene,
      id: scene.id || `scene-${index + 1}`,
      start: clamp(Number(scene.start) || 0, 0, duration),
      duration: clamp(Number(scene.duration) || 1, 0.1, duration),
      fit: scene.fit === "contain" ? "contain" : "cover",
      zoomFrom: clamp(Number(scene.zoomFrom) || 1, 0.5, 3),
      zoomTo: clamp(Number(scene.zoomTo) || 1, 0.5, 3),
    })),
    captions: (input.captions || []).map((caption, index) => ({
      ...caption,
      id: caption.id || `caption-${index + 1}`,
      start: clamp(Number(caption.start) || 0, 0, duration),
      end: clamp(Number(caption.end) || duration, 0, duration),
      size: clamp(Number(caption.size) || 68, 32, 140),
    })),
    overlays: input.overlays || [],
    audio: input.audio || [],
  };
}

export function createFootageEdl(title: string, sourceUrl: string, duration: number, direction: EditDirection): StudioEdl {
  const safeDuration = clamp(duration, 1, 60);
  const captionLength = Math.max(2, safeDuration / Math.max(direction.structure.length, 1));
  return normalizeEdl({
    version: 1,
    revision: 1,
    title,
    fps: 30,
    width: 1080,
    height: 1920,
    duration: safeDuration,
    background: "#08090b",
    scenes: [{
      id: "source-video",
      start: 0,
      duration: safeDuration,
      sourceType: "video",
      sourceUrl,
      sourceStart: 0,
      sourceEnd: safeDuration,
      fit: "cover",
      zoomFrom: 1,
      zoomTo: 1.08,
      transition: "cut",
    }],
    captions: direction.structure.map((text, index) => ({
      id: `caption-${index + 1}`,
      start: index * captionLength,
      end: Math.min(safeDuration, (index + 1) * captionLength),
      text,
      size: 68,
      position: "bottom",
    })),
    overlays: [{ id: "hook", start: 0, end: Math.min(3, safeDuration), type: "text", text: direction.hook, x: 50, y: 18, size: 82 }],
    audio: [],
  });
}

export function createIdeaEdl(title: string, direction: EditDirection, imageUrls: string[] = []): StudioEdl {
  const duration = 30;
  const count = Math.max(direction.structure.length, imageUrls.length, 3);
  const sceneDuration = duration / count;
  const colors = ["#111827", "#172554", "#3f1d2e", "#132a24"];
  return normalizeEdl({
    version: 1,
    revision: 1,
    title,
    fps: 30,
    width: 1080,
    height: 1920,
    duration,
    background: "#08090b",
    scenes: Array.from({ length: count }, (_, index) => ({
      id: `scene-${index + 1}`,
      start: index * sceneDuration,
      duration: sceneDuration,
      sourceType: imageUrls[index] ? "image" : "color",
      sourceUrl: imageUrls[index],
      background: colors[index % colors.length],
      fit: "cover",
      zoomFrom: 1,
      zoomTo: 1.12,
      transition: index === 0 ? "cut" : "fade",
    })),
    captions: direction.structure.map((text, index) => ({
      id: `caption-${index + 1}`,
      start: index * sceneDuration,
      end: Math.min(duration, (index + 1) * sceneDuration),
      text,
      size: 70,
      position: "bottom",
    })),
    overlays: [{ id: "hook", start: 0, end: 3.5, type: "text", text: direction.hook, x: 50, y: 16, size: 86 }],
    audio: [],
  });
}
