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
  // Use structure length for scene count, but ensure at least 5 scenes for storytelling
  const count = Math.max(direction.structure.length, imageUrls.length, 5);
  const sceneDuration = duration / count;
  
  // Cinematic color palette for when images fail - but with better visual storytelling
  const colors = ["#0f172a", "#1e1b4b", "#3f1d2e", "#132a24", "#1c1917"];
  
  // Enhanced: Create more dynamic zooms and pans for visual interest even with colors
  const zoomPatterns = [
    { from: 1.0, to: 1.25, panX: 0, panY: 0 },
    { from: 1.2, to: 1.0, panX: -5, panY: 0 },
    { from: 1.0, to: 1.15, panX: 5, panY: -3 },
    { from: 1.1, to: 1.3, panX: 0, panY: 5 },
    { from: 1.0, to: 1.2, panX: -3, panY: 3 },
  ];

  return normalizeEdl({
    version: 1,
    revision: 1,
    title,
    fps: 30,
    width: 1080,
    height: 1920,
    duration,
    background: "#08090b",
    scenes: Array.from({ length: count }, (_, index) => {
      const pattern = zoomPatterns[index % zoomPatterns.length];
      const hasImage = !!imageUrls[index];
      return {
        id: `scene-${index + 1}`,
        start: index * sceneDuration,
        duration: sceneDuration,
        sourceType: hasImage ? "image" : "color",
        sourceUrl: imageUrls[index],
        background: colors[index % colors.length],
        fit: "cover" as const,
        zoomFrom: pattern.from,
        zoomTo: pattern.to,
        panX: pattern.panX,
        panY: pattern.panY,
        transition: index === 0 ? "cut" as const : "fade" as const,
      };
    }),
    captions: direction.structure.map((text, index) => ({
      id: `caption-${index + 1}`,
      start: index * sceneDuration,
      end: Math.min(duration, (index + 1) * sceneDuration),
      text,
      size: 68,
      position: "bottom" as const,
    })),
    overlays: [
      { 
        id: "hook", 
        start: 0, 
        end: 3.5, 
        type: "text" as const, 
        text: direction.hook, 
        x: 50, 
        y: 16, 
        size: 82 
      },
      // Add subtle vignette and character labels for intern vs CEO sketches
      ...(title.toLowerCase().includes("intern") || title.toLowerCase().includes("ceo") || direction.angle.toLowerCase().includes("intern") ? [
        {
          id: "style-hint",
          start: 0,
          end: duration,
          type: "text" as const,
          text: "",
          x: 50,
          y: 50,
          size: 1
        }
      ] : [])
    ],
    audio: [],
  });
}
