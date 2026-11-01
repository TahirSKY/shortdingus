import { describe, expect, it } from 'vitest';
import { MARKER_RIG, markerPose, projectMarkerPoint, drawingTimeline, drawingState } from '../../../supabase/functions/_shared/whiteboard-pose';

describe('female marker rig', () => {
  for (const [width, height] of [[1080, 1920], [1920, 1080]]) {
    it(`keeps the intact arm beyond all ${width}x${height} drawing corners`, () => {
      for (const x of [0, width / 2, width]) for (const y of [0, height / 2, height]) {
        const pose = markerPose(x, y, width, height);
        expect(projectMarkerPoint(MARKER_RIG.tip, pose)).toEqual([x, y]);
        for (const cap of MARKER_RIG.cap) {
          const [cx, cy] = projectMarkerPoint(cap, pose);
          expect(width < height ? cx > width + 20 : cy > height + 20).toBe(true);
        }
      }
    });
  }
  it('keeps hand size consistent between portrait and landscape', () => {
    expect(markerPose(100, 100, 1080, 1920).scale).toBe(.8);
    expect(markerPose(900, 400, 1920, 1080).scale).toBe(.8);
  });
  it('budgets pen lifts inside the requested duration without drawing a connecting line', () => {
    const strokes = [{ points: [[0, 0], [100, 0]], length: 100, lengths: [0, 100] }, { points: [[500, 500], [600, 500]], length: 100, lengths: [0, 100] }];
    const timeline = drawingTimeline(strokes, 6, 1);
    expect(timeline[1].end).toBeCloseTo(6);
    const t = (timeline[1].travelStart + timeline[1].start) / 2;
    const state = drawingState(strokes, timeline, t);
    expect(state.lifted).toBe(true);
    expect(state.amounts).toEqual([100, 0]);
    expect(state.pen?.[0]).toBeCloseTo(300);
    expect(state.pen?.[1]).toBeCloseTo(250);
    expect(drawingState(strokes, timeline, t)).toEqual(state);
  });
});