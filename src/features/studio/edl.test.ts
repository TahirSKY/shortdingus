import { describe, expect, it } from "vitest";
import { createIdeaEdl, normalizeEdl } from "./edl";
import { compileEdlToRemotion } from "./compile-edl";
const direction = { id: "one", title: "One", hook: "Stop scrolling", angle: "Test", structure: ["First", "Second", "Third"] };
describe("Studio EDL", () => {
  it("normalizes output to vertical Remotion limits", () => {
    const result = normalizeEdl({ ...createIdeaEdl("Test", direction), duration: 90, fps: 30, width: 1080, height: 1920 });
    expect(result.duration).toBe(60);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
  });
  it("compiles the exact EDL timing into Remotion code", () => {
    const code = compileEdlToRemotion(createIdeaEdl("Test", direction));
    expect(code).toContain('durationInFrames\": 900');
    expect(code).toContain("OffthreadVideo");
    expect(code).toContain("numberOfSharedAudioTags").not.toBeTruthy();
  });
});
