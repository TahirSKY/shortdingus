import { describe, expect, it } from "vitest";
import { whiteboardClipState, whiteboardRequest } from "./whiteboard";

describe("manual whiteboard clips", () => {
  it("sends the uploaded image through clips mode to the selected project", () => {
    expect(whiteboardRequest("image-id", "project-id", 6, 1, "vertical", true, "original")).toEqual({ projectId: "project-id", format: "vertical", hand: true, clips: [{ assetId: "image-id", drawSeconds: 6, holdSeconds: 1, finish: "original" }] });
  });
  it("keeps pending clips pending until a saved video exists", () => {
    expect(whiteboardClipState({ meta: { creating: true }, storage_path: null })).toBe("rendering");
    expect(whiteboardClipState({ meta: { creating: false }, storage_path: "clip.mp4" })).toBe("ready");
  });
  it("reports a failed clip instead of presenting it as ready", () => {
    expect(whiteboardClipState({ meta: { creating: false, error: "AWS busy" }, storage_path: null })).toBe("error");
  });
});