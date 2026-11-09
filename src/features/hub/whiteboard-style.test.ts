import { describe, expect, it } from 'vitest';
import { sameWhiteboardStyle, whiteboardPenWidth, whiteboardStyle } from '../../../supabase/functions/_shared/whiteboard-style';
import { whiteboardRequest } from './whiteboard';

describe('adjustable drawing strokes', () => {
  it('keeps the original look when no settings are supplied', () => {
    expect(whiteboardStyle()).toEqual({ lineThickness: 1, inkDarkness: 1 });
    expect(whiteboardPenWidth(3, whiteboardStyle())).toBe(3);
  });
  it('allows fine lines below the old two-pixel floor', () => {
    expect(whiteboardPenWidth(2, whiteboardStyle({ lineThickness: 0.25 }))).toBe(0.5);
  });
  it('passes the user settings into the drawing request', () => {
    const r = whiteboardRequest('image', 'project', 6, 1, 'vertical', true, 'lines', { lineThickness: 0.45, inkDarkness: 0.7 });
    expect(r).toMatchObject({ lineThickness: 0.45, inkDarkness: 0.7, clips: [{ finish: 'lines' }] });
  });
  it('does not reuse a thick clip for a fine-line request', () => {
    expect(sameWhiteboardStyle({}, whiteboardStyle({ lineThickness: 0.45 }))).toBe(false);
    expect(sameWhiteboardStyle({}, whiteboardStyle())).toBe(true);
  });
  it('rejects invalid thickness', () => {
    for (const lineThickness of [0.24, 2.01, NaN, '0.5']) expect(() => whiteboardStyle({ lineThickness })).toThrow();
  });
  it('rejects invalid darkness', () => {
    for (const inkDarkness of [0.19, 1.01, Infinity, '0.7']) expect(() => whiteboardStyle({ inkDarkness })).toThrow();
  });
});