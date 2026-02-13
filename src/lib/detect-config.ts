// Detect video configuration from user code.
// Supported patterns:
//   1. Comment block: __REMOTION_CONFIG__ { fps: 60, durationInFrames: 900 }
//   2. compositionConfig = { ... }
//   3. Inline props: durationInFrames: 300, fps: 30

export interface DetectedConfig {
  fps?: number;
  durationInSeconds?: number;
  width?: number;
  height?: number;
}

// eslint-disable-next-line no-useless-escape
const CONFIG_COMMENT = /\/\*\s*__REMOTION_CONFIG__\s*([\s\S]*?)\s*\*\//;
const COMPOSITION_CONFIG = /compositionConfig\s*[:=]\s*\{([^}]+)\}/;

function extractNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = Number(obj[key]);
  return isFinite(v) && v > 0 ? v : undefined;
}

function parseLooseJson(raw: string): Record<string, unknown> {
  try {
    // Add quotes around unquoted keys for JSON.parse
    const json = raw.replace(/(\w+)\s*:/g, '"$1":').replace(/,\s*}/g, "}");
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
    if (dis) {
      result.durationInSeconds = dis;
    } else if (dif && result.fps) {
      result.durationInSeconds = Math.round(dif / result.fps);
    } else if (dif) {
      result.durationInSeconds = Math.round(dif / 30); // assume 30fps default
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
    if (dis) {
      result.durationInSeconds = dis;
    } else if (dif) {
      result.durationInSeconds = Math.round(dif / (result.fps || 30));
    }
    return result;
  }

  // 3. Inline detection: durationInFrames: 300 or fps: 60
  const fpsMatch = code.match(/fps\s*[:=]\s*(\d+)/);
  if (fpsMatch) result.fps = Number(fpsMatch[1]);

  const difMatch = code.match(/durationInFrames\s*[:=]\s*(\d+)/);
  if (difMatch) {
    result.durationInSeconds = Math.round(Number(difMatch[1]) / (result.fps || 30));
  }

  const disMatch = code.match(/durationInSeconds\s*[:=]\s*(\d+)/);
  if (disMatch) {
    result.durationInSeconds = Number(disMatch[1]);
  }

  return result;
}
