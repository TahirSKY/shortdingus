import type { StudioEdl } from "./types";
import { normalizeEdl } from "./edl";

export function compileEdlToRemotion(input: StudioEdl): string {
  const edl = normalizeEdl(input);
  const frames = Math.ceil(edl.duration * edl.fps);
  const serialized = JSON.stringify(edl).replace(/</g, "\\u003c");
  return `/* REMOTION_CONFIG { "fps": 30, "durationInFrames": ${frames}, "width": 1080, "height": 1920 } */
import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
const EDL = ${serialized};

// Enhanced Scene with better Ken Burns and vignette
const Scene = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame / fps;
  const progress = Math.max(0, Math.min(1, local / scene.duration));
  const zoom = scene.zoomFrom + (scene.zoomTo - scene.zoomFrom) * progress;
  const panX = (scene.panX || 0) * progress;
  const panY = (scene.panY || 0) * progress;
  const opacity = scene.transition === "fade" ? interpolate(frame, [0, Math.min(12, scene.duration * fps / 3)], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const mediaStyle = { 
    width: "100%", 
    height: "100%", 
    objectFit: scene.fit || "cover", 
    transform: \`scale(\${zoom}) translate(\${panX}%, \${panY}%)\`,
    filter: "contrast(1.05) saturate(1.1)"
  };
  return <AbsoluteFill style={{ background: scene.background || EDL.background, opacity, overflow: "hidden" }}>
    {scene.sourceType === "video" && scene.sourceUrl ? <OffthreadVideo src={scene.sourceUrl} startFrom={Math.round((scene.sourceStart || 0) * fps)} endAt={scene.sourceEnd ? Math.round(scene.sourceEnd * fps) : undefined} style={mediaStyle} /> : null}
    {scene.sourceType === "image" && scene.sourceUrl ? <Img src={scene.sourceUrl} style={mediaStyle} /> : null}
    {scene.sourceType === "color" ? <AbsoluteFill style={{ background: scene.background || "#111827" }} /> : null}
    {/* Vignette and gradient for text readability */}
    <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.1) 100%)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.4) 100%)" }} />
  </AbsoluteFill>;
};

// Enhanced Caption - viral style with highlight support
const Caption = ({ caption }) => {
  const frame = useCurrentFrame();
  const isHighlight = caption.text.includes("**") || caption.text.toLowerCase().includes("too close") || caption.text.toLowerCase().includes("threshold") || caption.text.toLowerCase().includes("financed");
  const cleanText = caption.text.replace(/\\*\\*/g, "");
  const placement = caption.position === "top" ? "flex-start" : caption.position === "center" ? "center" : "flex-end";
  const scale = interpolate(frame % 30, [0, 15, 30], [1, 1.02, 1], { extrapolateRight: "clamp" });
  
  return <AbsoluteFill style={{ justifyContent: placement, alignItems: "center", padding: caption.position === "bottom" ? "0 48px 220px" : caption.position === "top" ? "180px 48px 0" : "72px", pointerEvents: "none" }}>
    <div style={{ 
      color: isHighlight ? "black" : "white", 
      background: isHighlight ? "#fef08a" : "white",
      fontFamily: "Inter, Arial, sans-serif", 
      fontSize: caption.size, 
      lineHeight: 1.1, 
      fontWeight: 850, 
      textAlign: "center", 
      padding: "14px 26px",
      borderRadius: 16,
      maxWidth: 900,
      boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
      transform: \`scale(\${scale})\`,
      border: isHighlight ? "3px solid black" : "none",
      textShadow: isHighlight ? "none" : "0 2px 10px rgba(0,0,0,0.8)"
    }}>{cleanText}</div>
  </AbsoluteFill>;
};

const Overlay = ({ overlay }) => {
  if (!overlay.text) return null;
  return <div style={{ 
    position: "absolute", 
    left: \`\${overlay.x}%\`, 
    top: \`\${overlay.y}%\`, 
    transform: "translate(-50%, -50%)", 
    color: "white", 
    fontFamily: "Inter, Arial, sans-serif", 
    fontSize: overlay.size || 64, 
    fontWeight: 900, 
    textAlign: "center", 
    width: overlay.width ? \`\${overlay.width}%\` : "88%", 
    textShadow: "0 4px 22px rgba(0,0,0,.9)",
    lineHeight: 1.1
  }}>
    {overlay.type === "image" && overlay.imageUrl ? <Img src={overlay.imageUrl} style={{ width: "100%", borderRadius: 12 }} /> : overlay.text}
  </div>;
};

export default function StudioComposition() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: EDL.background }}>
    {EDL.scenes.map((scene) => <Sequence key={scene.id} from={Math.round(scene.start * EDL.fps)} durationInFrames={Math.max(1, Math.round(scene.duration * EDL.fps))}><Scene scene={scene} /></Sequence>)}
    {EDL.captions.map((caption) => <Sequence key={caption.id} from={Math.round(caption.start * EDL.fps)} durationInFrames={Math.max(1, Math.round((caption.end - caption.start) * EDL.fps))}><Caption caption={caption} /></Sequence>)}
    {EDL.overlays.map((overlay) => <Sequence key={overlay.id} from={Math.round(overlay.start * EDL.fps)} durationInFrames={Math.max(1, Math.round((overlay.end - overlay.start) * EDL.fps))}><Overlay overlay={overlay} /></Sequence>)}
    {EDL.audio.map((audio) => <Sequence key={audio.id} from={Math.round(audio.start * EDL.fps)} durationInFrames={Math.max(1, Math.round((audio.end - audio.start) * EDL.fps))}><Audio src={audio.url} volume={audio.volume} /></Sequence>)}
    {/* Progress bar */}
    <AbsoluteFill style={{ justifyContent: "flex-end" }}>
      <div style={{ height: 5, background: "rgba(255,255,255,0.2)", width: "100%" }}>
        <div style={{ height: "100%", background: "white", width: \`\${(frame / (EDL.duration * EDL.fps)) * 100}%\` }} />
      </div>
    </AbsoluteFill>
  </AbsoluteFill>;
}`;
}
