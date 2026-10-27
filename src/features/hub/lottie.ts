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
  return `/* REMOTION_CONFIG {width: ${l.width}, height: ${l.height}, fps: ${l.fps}, durationInFrames: ${l.frames}, durationInSeconds: ${l.frames / l.fps}} */
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

/** Names of Lottie layers we treat as the character's mouth. */
export const MOUTH_LAYER_RE = /mouth|lip/i;

export function mouthLayers(data: unknown): string[] {
  const j = data as Record<string, any> | null;
  if (!j || !Array.isArray(j.layers)) return [];
  return j.layers.map((l: any) => String(l?.nm ?? "")).filter((n: string) => MOUTH_LAYER_RE.test(n));
}

export interface TalkingOptions {
  audioUrl?: string;
  audioSeconds?: number;
  /** Loop the animation so it fills a longer voiceover. */
  loop?: boolean;
  /** Baked [frame, mouthScaleY] pairs from client-side audio analysis. */
  mouthKeys?: [number, number][];
  background?: string;
}

/**
 * Remotion code for a Lottie character with an optional voiceover.
 * Mouth movement is baked in as scale keyframes on mouth-named layers,
 * so it renders identically in the preview and on Lambda with no extra deps.
 */
export function talkingLottieCode(url: string, data: unknown, opts: TalkingOptions = {}) {
  const l = readLottie(data);
  const fps = l.fps;
  const audioFrames = opts.audioSeconds ? Math.ceil(opts.audioSeconds * fps) : 0;
  const frames = Math.max(l.frames, audioFrames, 1);
  const seconds = frames / fps;
  const keys = opts.mouthKeys?.length ? JSON.stringify(opts.mouthKeys) : "null";
  return `/* REMOTION_CONFIG {width: ${l.width}, height: ${l.height}, fps: ${fps}, durationInFrames: ${frames}, durationInSeconds: ${seconds}} */
/* compositionConfig = { width: ${l.width}, height: ${l.height}, fps: ${fps}, durationInSeconds: ${seconds} } */
import React, {useEffect, useState} from "react";
import {AbsoluteFill, Audio, delayRender, continueRender, cancelRender} from "remotion";
import {Lottie} from "@remotion/lottie";

// [frame, mouthScaleY] pairs baked from the voiceover's loudness.
const MOUTH_KEYS = ${keys};

function patchMouth(data) {
  if (!MOUTH_KEYS) return data;
  const clone = JSON.parse(JSON.stringify(data));
  for (const layer of clone.layers || []) {
    if (!/mouth|lip/i.test(layer.nm || "")) continue;
    let base = [100, 100];
    const k = layer.ks && layer.ks.s && layer.ks.s.k;
    if (Array.isArray(k) && typeof k[0] === "number") base = k;
    else if (Array.isArray(k) && k[0] && Array.isArray(k[0].s)) base = k[0].s;
    const kf = MOUTH_KEYS.map(([t, s]) => ({
      i: {x: [0.833, 0.833], y: [0.833, 0.833]},
      o: {x: [0.167, 0.167], y: [0.167, 0.167]},
      t, s: [base[0], base[1] * s],
    }));
    kf.push({t: MOUTH_KEYS[MOUTH_KEYS.length - 1][0] + 1});
    layer.ks.s = {a: 1, k: kf};
  }
  return clone;
}

export default function TalkingAvatar() {
  const [data, setData] = useState(null);
  const [handle] = useState(() => delayRender("Load talking animation"));
  useEffect(() => {
    fetch(${JSON.stringify(url)}).then(r => {
      if (!r.ok) throw new Error("Animation could not be loaded");
      return r.json();
    }).then(j => { setData(patchMouth(j)); continueRender(handle); }).catch(e => cancelRender(e));
  }, [handle]);
  return (
    <AbsoluteFill style={{backgroundColor: ${JSON.stringify(opts.background || "#f4efe6")}}}>
      {data && <Lottie animationData={data} loop={${opts.loop ? "true" : "false"}} style={{width: "100%", height: "100%"}} />}
      ${opts.audioUrl ? `<Audio src={${JSON.stringify(opts.audioUrl)}} />` : ""}
    </AbsoluteFill>
  );
}
`;
}