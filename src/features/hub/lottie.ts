export function readLottie(data: unknown) {
  const j = data as Record<string, any> | null;
  if (!j || !Number.isFinite(j.fr) || j.fr <= 0 || !Array.isArray(j.layers)
    || !Number.isFinite(j.ip) || !Number.isFinite(j.op) || j.op <= j.ip
    || !Number.isFinite(j.w) || j.w <= 0 || !Number.isFinite(j.h) || j.h <= 0) {
    throw new Error("This file is not a playable Lottie JSON animation.");
  }
  return {
    fps: j.fr as number, frames: Math.ceil(j.op - j.ip),
    width: j.w as number, height: j.h as number,
    layers: j.layers.length,
    moves: (Array.isArray(j.markers) ? j.markers : []).filter((m: any) => Number.isFinite(m.tm) && Number.isFinite(m.dr)).map((m: any) => ({ name: String(m.cm ?? "").trim(), start: m.tm, frames: m.dr })),
  };
}

export function lottieCode(url: string, data: unknown) {
  const l = readLottie(data);
  return `/* REMOTION_CONFIG { width: ${l.width}, height: ${l.height}, fps: ${l.fps}, durationInFrames: ${l.frames} } */
/* compositionConfig = { width: ${l.width}, height: ${l.height}, fps: ${l.fps}, durationInSeconds: ${l.frames / l.fps} } */
import React, {useEffect, useState} from "react";
import {AbsoluteFill, delayRender, continueRender, cancelRender} from "remotion";
import {Lottie} from "@remotion/lottie";

export default function AnimationVideo() {
  const [data, setData] = useState(null);
  const [handle] = useState(() => delayRender("Load Lottie animation"));
  useEffect(() => {
    fetch(${JSON.stringify(url)}).then(r => {
      if (!r.ok) throw new Error("Animation could not be loaded");
      return r.json();
    }).then(j => { setData(j); continueRender(handle); }).catch(e => cancelRender(e));
  }, [handle]);
  return <AbsoluteFill>{data && <Lottie animationData={data} loop={false} style={{width: "100%", height: "100%"}} />}</AbsoluteFill>;
}
`;
}