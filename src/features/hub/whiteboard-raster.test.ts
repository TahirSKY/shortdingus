import { describe, expect, it } from 'vitest';
import { paintWhiteboard } from '../../../supabase/functions/_shared/whiteboard-raster';

function recorder() {
  const lines: number[][] = [];
  const calls: string[] = [];
  const ctx = new Proxy({}, { set: () => true, get: (_, key) => (...args: number[]) => { calls.push(String(key)); if (key === 'lineTo') lines.push(args); } }) as CanvasRenderingContext2D;
  return { ctx, lines, calls };
}
const stroke = { points: [[10, 20], [110, 20], [110, 120]], length: 200 };
const layer = (amount: number) => ({ strokes: [stroke], amounts: [amount], board: { x: 0, y: 0, scale: 1 }, penWidth: 3 });

describe('whiteboard raster frame isolation', () => {
  it('only paints geometry up to the current nib position', () => {
    const r = recorder();
    paintWhiteboard(r.ctx, 1080, 1920, [layer(125)]);
    expect(r.lines).toEqual([[110, 20], [110, 45]]);
    expect(r.calls.filter(c => c === 'stroke')).toHaveLength(1);
  });
  it('clears the entire previous frame before painting, including backwards seeks', () => {
    const r = recorder();
    paintWhiteboard(r.ctx, 1080, 1920, [layer(200)]);
    const at = r.calls.length;
    paintWhiteboard(r.ctx, 1080, 1920, [layer(0)]);
    expect(r.calls.slice(at, at + 3)).toEqual(['setTransform', 'clearRect', 'fillRect']);
    expect(r.calls.slice(at)).not.toContain('stroke');
  });
  it('paints multiple scene layers without duplicating a stroke', () => {
    const r = recorder();
    paintWhiteboard(r.ctx, 1920, 1080, [layer(50), layer(0)]);
    expect(r.lines).toEqual([[60, 20]]);
    expect(r.calls.filter(c => c === 'stroke')).toHaveLength(1);
  });
});