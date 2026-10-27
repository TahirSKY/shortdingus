import { describe, expect, it } from "vitest";
import { lottieCode, readLottie } from "./lottie";

describe("Lottie timing", () => {
  const soy = { fr: 30, ip: 0, op: 110, w: 1920, h: 1080, layers: Array(33).fill({}), markers: [] };
  it("preserves the uploaded Soy Yo animation's native timing and dimensions", () => {
    expect(readLottie(soy)).toMatchObject({ fps: 30, frames: 110, width: 1920, height: 1080, layers: 33 });
  });
  it("uses the animation's in/out points rather than treating its end as its duration", () => {
    expect(readLottie({ ...soy, ip: 30, op: 140 }).frames).toBe(110);
  });
  it("rejects animations without playable timing", () => {
    expect(() => readLottie({ ...soy, fr: 0 })).toThrow();
  });
  it("hands off the same 110 frames at 30fps to Remotion", () => {
    expect(lottieCode("https://example.com/animation.json", soy)).toContain("fps: 30, durationInFrames: 110");
  });
});