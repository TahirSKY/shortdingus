import { describe, expect, it } from 'vitest';
import { clampRenderDurationSeconds, MAX_RENDER_DURATION_SECONDS, resolveRenderTiming } from '../../../supabase/functions/_shared/render-timing';

describe('long video render timing', () => {
  it('preserves the 5:48 composition duration instead of truncating at five minutes', () => {
    expect(resolveRenderTiming('/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 10455 } */', 30, 10))
      .toEqual({ fps: 30, durationInFrames: 10455 });
  });
  it('supports code-defined durations up to 15 minutes at 30 and 60 fps', () => {
    expect(resolveRenderTiming('/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 27000 } */', 30, 10).durationInFrames).toBe(27000);
    expect(resolveRenderTiming('/* REMOTION_CONFIG { "fps": 60, "durationInFrames": 54000 } */', 60, 10).durationInFrames).toBe(54000);
  });
  it('caps longer compositions at the documented 15-minute maximum', () => {
    expect(MAX_RENDER_DURATION_SECONDS).toBe(900);
    expect(resolveRenderTiming('/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 30000 } */', 30, 10).durationInFrames).toBe(27000);
  });
  it('keeps the duration-in-seconds arithmetic parsing behavior', () => {
    expect(resolveRenderTiming('/* REMOTION_CONFIG { "fps": 30, "durationInSeconds": 348.5 } */', 30, 10))
      .toEqual({ fps: 30, durationInFrames: 10455 });
  });
  it('uses the same limit when normalizing the render dialog value', () => {
    expect(clampRenderDurationSeconds(348.5)).toBe(348.5);
    expect(clampRenderDurationSeconds(1000)).toBe(900);
    expect(clampRenderDurationSeconds(0)).toBe(1);
  });
});