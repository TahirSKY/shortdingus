import { describe, expect, it } from 'vitest';
import { drawingSoundVolume } from '../../../supabase/functions/_shared/whiteboard-audio';
describe('built-in drawing sound', () => {
  const timeline = [{ start: 0, end: 1 }, { start: 1.2, end: 2 }];
  it('plays quietly while the pen draws', () => {
    expect(drawingSoundVolume(timeline, .5)).toBe(.22);
  });
  it('is silent while the pen lifts between strokes', () => {
    expect(drawingSoundVolume(timeline, 1.1)).toBe(0);
  });
  it('is silent while the finished picture holds', () => {
    expect(drawingSoundVolume(timeline, 2.5)).toBe(0);
  });
});