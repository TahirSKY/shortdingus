import { describe, expect, it } from "vitest";
import { pendingWhiteboardImages, whiteboardClipState, whiteboardRequest } from "./whiteboard";
import type { Asset } from "./api";

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
  it("keeps waiting drawings queued instead of claiming they are rendering", () => {
    expect(whiteboardClipState({ meta: { creating: true, whiteboard_status: "queued" }, storage_path: null })).toBe("queued");
  });
  it("manual batches skip ready and active clips but allow failed images to retry", () => {
    const images = ["ready", "queued", "rendering", "error", "new"].map(id => ({ id, kind: "image", storage_path: `${id}.png`, tags: [], meta: {} }));
    const clips = ["ready", "queued", "rendering", "error"].map(state => ({ id: `clip-${state}`, kind: "video", tags: ["whiteboard-clip"], storage_path: state === "ready" ? "clip.mp4" : null, meta: { source_asset_id: state, creating: ["queued", "rendering"].includes(state), whiteboard_status: state, ...(state === "error" ? { error: "busy" } : {}) } }));
    expect(pendingWhiteboardImages([...images, ...clips] as Asset[]).map(a => a.id)).toEqual(["error", "new"]);
  });
});