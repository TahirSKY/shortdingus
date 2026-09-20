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
const Scene = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame / fps;
  const progress = Math.max(0, Math.min(1, local / scene.duration));
  const zoom = scene.zoomFrom + (scene.zoomTo - scene.zoomFrom) * progress;
  const opacity = scene.transition === "fade" ? interpolate(frame, [0, Math.min(10, scene.duration * fps / 3)], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const mediaStyle = { width: "100%", height: "100%", objectFit: scene.fit || "cover", transform: \`scale(\${zoom}) translate(\${scene.panX || 0}%, \${scene.panY || 0}%)\` };
  return <AbsoluteFill style={{ background: scene.background || EDL.background, opacity, overflow: "hidden" }}>
    {scene.sourceType === "video" && scene.sourceUrl ? <OffthreadVideo src={scene.sourceUrl} startFrom={Math.round((scene.sourceStart || 0) * fps)} endAt={scene.sourceEnd ? Math.round(scene.sourceEnd * fps) : undefined} style={mediaStyle} /> : null}
    {scene.sourceType === "image" && scene.sourceUrl ? <Img src={scene.sourceUrl} style={mediaStyle} /> : null}
  </AbsoluteFill>;
};
const Caption = ({ caption }) => {
  const placement = caption.position === "top" ? "flex-start" : caption.position === "center" ? "center" : "flex-end";
  return <AbsoluteFill style={{ justifyContent: placement, alignItems: "center", padding: caption.position === "bottom" ? "0 72px 210px" : caption.position === "top" ? "180px 72px 0" : "72px", pointerEvents: "none" }}>
    <div style={{ color: "white", fontFamily: "Inter, Arial, sans-serif", fontSize: caption.size, lineHeight: 1.05, fontWeight: 850, textAlign: "center", textShadow: "0 4px 18px rgba(0,0,0,.85)", WebkitTextStroke: "2px rgba(0,0,0,.65)" }}>{caption.text}</div>
  </AbsoluteFill>;
};
const Overlay = ({ overlay }) => <div style={{ position: "absolute", left: \`\${overlay.x}%\`, top: \`\${overlay.y}%\`, transform: "translate(-50%, -50%)", color: "white", fontFamily: "Inter, Arial, sans-serif", fontSize: overlay.size || 64, fontWeight: 900, textAlign: "center", width: overlay.width ? \`\${overlay.width}%\` : "86%", textShadow: "0 4px 22px rgba(0,0,0,.9)" }}>{overlay.type === "image" && overlay.imageUrl ? <Img src={overlay.imageUrl} style={{ width: "100%" }} /> : overlay.text}</div>;
export default function StudioComposition() {
  return <AbsoluteFill style={{ background: EDL.background }}>
    {EDL.scenes.map((scene) => <Sequence key={scene.id} from={Math.round(scene.start * EDL.fps)} durationInFrames={Math.max(1, Math.round(scene.duration * EDL.fps))}><Scene scene={scene} /></Sequence>)}
    {EDL.captions.map((caption) => <Sequence key={caption.id} from={Math.round(caption.start * EDL.fps)} durationInFrames={Math.max(1, Math.round((caption.end - caption.start) * EDL.fps))}><Caption caption={caption} /></Sequence>)}
    {EDL.overlays.map((overlay) => <Sequence key={overlay.id} from={Math.round(overlay.start * EDL.fps)} durationInFrames={Math.max(1, Math.round((overlay.end - overlay.start) * EDL.fps))}><Overlay overlay={overlay} /></Sequence>)}
    {EDL.audio.map((audio) => <Sequence key={audio.id} from={Math.round(audio.start * EDL.fps)} durationInFrames={Math.max(1, Math.round((audio.end - audio.start) * EDL.fps))}><Audio src={audio.url} volume={audio.volume} /></Sequence>)}
  </AbsoluteFill>;
}`;
}
