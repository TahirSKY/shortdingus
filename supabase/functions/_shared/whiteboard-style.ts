export type WhiteboardStyle = { lineThickness: number; inkDarkness: number };

export function whiteboardStyle(input: { lineThickness?: unknown; inkDarkness?: unknown } = {}): WhiteboardStyle {
  const lineThickness = input.lineThickness ?? 1;
  const inkDarkness = input.inkDarkness ?? 1;
  if (typeof lineThickness !== 'number' || !Number.isFinite(lineThickness) || lineThickness < 0.25 || lineThickness > 2) throw new Error('Line thickness must be between 0.25 and 2.');
  if (typeof inkDarkness !== 'number' || !Number.isFinite(inkDarkness) || inkDarkness < 0.2 || inkDarkness > 1) throw new Error('Ink darkness must be between 0.2 and 1.');
  return { lineThickness, inkDarkness };
}

export function whiteboardPenWidth(baseWidth: number, style: WhiteboardStyle) {
  return Math.max(2, baseWidth) * style.lineThickness;
}

export function sameWhiteboardStyle(meta: Record<string, unknown> | null, style: WhiteboardStyle) {
  return (meta?.line_thickness ?? 1) === style.lineThickness && (meta?.ink_darkness ?? 1) === style.inkDarkness;
}