export const MAX_RENDER_DURATION_SECONDS = 15 * 60;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Evaluates plain arithmetic like `2015 / 30`; anything else → NaN. */
function num(expr: string | undefined): number {
  if (!expr) return NaN;
  const e = expr.trim();
  if (!/^[\d\s.+\-*/()]+$/.test(e)) return NaN;
  try { return Number(new Function(`return (${e});`)()); } catch { return NaN; }
}

function readKey(block: string, key: string): number {
  const m = block.match(new RegExp(`["']?${key}["']?\\s*[:=]\\s*([^,\\n}]+)`));
  return num(m?.[1]);
}

/** Honor code duration, but never accept a duration above the supported 15-minute limit. */
export function resolveRenderTiming(code: string, bodyFps: number, bodySeconds: number) {
  const header = code.match(/\/\*\s*(?:__)?REMOTION_CONFIG(?:__)?\s*([\s\S]*?)\*\//i)?.[1];
  const cfg = code.match(/compositionConfig\s*=\s*\{([^}]+)\}/)?.[1];
  const ok = (n: number) => isFinite(n) && n > 0;
  let fps = NaN, frames = NaN, seconds = NaN;
  for (const block of [header, cfg]) {
    if (!block) continue;
    if (!ok(fps)) fps = readKey(block, "fps");
    if (!ok(frames)) frames = readKey(block, "durationInFrames");
    if (!ok(seconds)) seconds = readKey(block, "durationInSeconds");
  }
  if (!ok(fps)) fps = ok(bodyFps) ? bodyFps : 30;
  fps = clamp(Math.round(fps), 1, 60);
  if (!ok(frames)) frames = Math.ceil((ok(seconds) ? seconds : ok(bodySeconds) ? bodySeconds : 10) * fps);
  return { fps, durationInFrames: clamp(Math.floor(frames), 1, MAX_RENDER_DURATION_SECONDS * fps) };
}

export function clampRenderDurationSeconds(value: number) {
  return Math.max(1, Math.min(MAX_RENDER_DURATION_SECONDS, Number.isFinite(value) ? value : 10));
}