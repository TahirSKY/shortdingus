// Detect video configuration from user code.
// Supported patterns:
//   1. Comment block: REMOTION_CONFIG { fps: 60, durationInFrames: 900 }
//   2. compositionConfig = { ... }
//   3. Inline props: durationInFrames: 300, fps: 30

export interface DetectedConfig {
  fps?: number;
  durationInSeconds?: number;
  durationInFrames?: number;
  width?: number;
  height?: number;
}

// Supports both REMOTION_CONFIG and legacy __REMOTION_CONFIG__ markers.
const CONFIG_COMMENT = /\/\*\s*(?:__)?REMOTION_CONFIG(?:__)?\s*([\s\S]*?)\s*\*\//i;
const COMPOSITION_CONFIG = /compositionConfig\s*[:=]\s*\{([^}]+)\}/;

function extractNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = Number(obj[key]);
  return isFinite(v) && v > 0 ? v : undefined;
}

function parseLooseJson(raw: string): Record<string, unknown> {
  try {
    // Accept both `{ fps: 30 }` and `fps: 30` payloads.
    const trimmed = raw.trim();
    const withoutOuterBraces = trimmed.startsWith("{") && trimmed.endsWith("}")
      ? trimmed.slice(1, -1)
      : trimmed;

    // Add quotes around unquoted keys for JSON.parse (including first key)
    const json = withoutOuterBraces
      .replace(/(^|[,{]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/,\s*}/g, "}");

    return JSON.parse(`{${json}}`);
  } catch {
    return {};
  }
}

export function detectConfig(code: string): DetectedConfig {
  const result: DetectedConfig = {};

  // 1. Check for __REMOTION_CONFIG__ comment
  const commentMatch = code.match(CONFIG_COMMENT);
  if (commentMatch) {
    const obj = parseLooseJson(commentMatch[1]);
    result.fps = extractNumber(obj, "fps");
    result.width = extractNumber(obj, "width");
    result.height = extractNumber(obj, "height");
    const dif = extractNumber(obj, "durationInFrames");
    const dis = extractNumber(obj, "durationInSeconds");
    if (dif) result.durationInFrames = dif;
    if (dis) {
      result.durationInSeconds = dis;
    } else if (dif && result.fps) {
      result.durationInSeconds = Math.round(dif / result.fps);
    } else if (dif) {
      result.durationInSeconds = Math.round(dif / 30);
    }
    return result;
  }

  // 2. Check for compositionConfig object
  const configMatch = code.match(COMPOSITION_CONFIG);
  if (configMatch) {
    const obj = parseLooseJson(configMatch[1]);
    result.fps = extractNumber(obj, "fps");
    result.width = extractNumber(obj, "width");
    result.height = extractNumber(obj, "height");
    const dif = extractNumber(obj, "durationInFrames");
    const dis = extractNumber(obj, "durationInSeconds");
    if (dif) result.durationInFrames = dif;
    if (dis) {
      result.durationInSeconds = dis;
    } else if (dif) {
      result.durationInSeconds = Math.round(dif / (result.fps || 30));
    }
    return result;
  }

  // 3. Inline detection: durationInFrames: 300 or fps: 60
  // Match fps: 30, fps={30}, fps = 30
  const fpsMatch = code.match(/fps\s*[:=]\s*\{?\s*(\d+)\s*\}?/);
  if (fpsMatch) result.fps = Number(fpsMatch[1]);

  // Match durationInFrames: 120, durationInFrames={120}, durationInFrames = 120
  const difMatch = code.match(/durationInFrames\s*[:=]\s*\{?\s*(\d+)\s*\}?/);
  if (difMatch) {
    result.durationInFrames = Number(difMatch[1]);
    result.durationInSeconds = Math.round(Number(difMatch[1]) / (result.fps || 30));
  }

  // Match durationInSeconds: 10, durationInSeconds={10}, durationInSeconds = 10
  const disMatch = code.match(/durationInSeconds\s*[:=]\s*\{?\s*(\d+)\s*\}?/);
  if (disMatch) {
    result.durationInSeconds = Number(disMatch[1]);
  }

  return result;
}
