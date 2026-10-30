/**
 * Centre-line tracer: binary ink mask → single-pass pen strokes.
 * Zhang-Suen thinning finds the middle of every line, the skeleton graph is
 * walked into polylines, and strokes are ordered big shapes first (largest ink
 * group first, nearest-neighbour inside a group) so the pen draws like a person.
 */
export type Pt = [number, number];
export type Stroke = { points: Pt[]; length: number };
export type Traced = { strokes: Stroke[]; width: number; height: number; penWidth: number };

const MIN_STROKE = 8;
const MAX_STROKES = 700;

function thin(m: Uint8Array, w: number, h: number) {
  const del: number[] = [];
  let changed = true;
  const at = (x: number, y: number) => m[y * w + x];
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!at(x, y)) continue;
          const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
          const p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let i = 0; i < 8; i++) if (!seq[i] && seq[i + 1]) a++;
          if (a !== 1) continue;
          if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
          del.push(y * w + x);
        }
      }
      if (del.length) changed = true;
      for (const i of del) m[i] = 0;
    }
  }
}

function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) { // closed loop: simplify each half
    const m = pts.length >> 1;
    return [...rdp(pts.slice(0, m + 1), eps).slice(0, -1), ...rdp(pts.slice(m), eps)];
  }
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  let idx = 0, dmax = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax <= eps) return [a, b];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

function smooth(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p, q] = [pts[i], pts[i + 1]];
    out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const lenOf = (p: Pt[]) => { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; };

/** ink: 1 = ink pixel. */
export function traceCenterlines(ink: Uint8Array, w: number, h: number): Traced {
  let inkCount = 0;
  for (let i = 0; i < ink.length; i++) inkCount += ink[i];
  const sk = ink.slice();
  // Clear the border so neighbour lookups stay in range.
  for (let x = 0; x < w; x++) { sk[x] = 0; sk[(h - 1) * w + x] = 0; }
  for (let y = 0; y < h; y++) { sk[y * w] = 0; sk[y * w + w - 1] = 0; }
  thin(sk, w, h);
  let skCount = 0;
  for (let i = 0; i < sk.length; i++) skCount += sk[i];
  const penWidth = Math.max(1.5, Math.min(14, skCount ? inkCount / skCount : 3));

  const N = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const nbrs = (i: number) => {
    const x = i % w, y = (i / w) | 0, out: number[] = [];
    for (const [dx, dy] of N) { const j = (y + dy) * w + x + dx; if (sk[j]) out.push(j); }
    return out;
  };
  // Component labels (for "big shapes first").
  const comp = new Int32Array(w * h).fill(-1);
  const compBox: { minX: number; minY: number; maxX: number; maxY: number }[] = [];
  for (let i = 0; i < sk.length; i++) {
    if (!sk[i] || comp[i] >= 0) continue;
    const id = compBox.length, box = { minX: w, minY: h, maxX: 0, maxY: 0 };
    const stack = [i]; comp[i] = id;
    while (stack.length) {
      const c = stack.pop()!, x = c % w, y = (c / w) | 0;
      box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x); box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y);
      for (const j of nbrs(c)) if (comp[j] < 0) { comp[j] = id; stack.push(j); }
    }
    compBox.push(box);
  }

  // Walk skeleton edges into polylines: endpoints first, then junctions, then closed loops.
  const used = new Set<number>(); // edge key a*W+b
  const ek = (a: number, b: number) => (a < b ? a * 1e7 + b : b * 1e7 + a);
  const raw: { pts: Pt[]; comp: number }[] = [];
  const walk = (start: number) => {
    for (const first of nbrs(start)) {
      if (used.has(ek(start, first))) continue;
      const path = [start, first];
      used.add(ek(start, first));
      let prev = start, cur = first;
      while (true) {
        const ns = nbrs(cur).filter((j) => j !== prev && !used.has(ek(cur, j)));
        if (!ns.length) break;
        // Keep going straight: pick the neighbour with the smallest turn (pen glides through junctions).
        const hx = (cur % w) - (prev % w), hy = ((cur / w) | 0) - ((prev / w) | 0);
        let next = ns[0], bestDot = -Infinity;
        for (const j of ns) {
          const dx = (j % w) - (cur % w), dy = ((j / w) | 0) - ((cur / w) | 0);
          const dot = (dx * hx + dy * hy) / Math.hypot(dx, dy);
          if (dot > bestDot) { bestDot = dot; next = j; }
        }
        if (bestDot < -0.1) break; // sharp U-turn: lift the pen
        // Mark the staircase shortcut edges around this step as used so they don't become specks.
        for (const j of ns) if (j !== next && Math.abs((j % w) - (next % w)) <= 1 && Math.abs(((j / w) | 0) - ((next / w) | 0)) <= 1) used.add(ek(cur, j));
        used.add(ek(cur, next));
        path.push(next); prev = cur; cur = next;
      }
      raw.push({ pts: path.map((i) => [i % w, (i / w) | 0] as Pt), comp: comp[start] });
    }
  };
  const degree = (i: number) => nbrs(i).length;
  for (let i = 0; i < sk.length; i++) if (sk[i] && degree(i) === 1) walk(i);
  for (let i = 0; i < sk.length; i++) if (sk[i] && degree(i) > 2) walk(i);
  for (let i = 0; i < sk.length; i++) if (sk[i]) walk(i);

  // Merge tiny junction fragments into a neighbour when ends touch, then simplify.
  let strokes: (Stroke & { comp: number })[] = raw
    .map((r) => { const points = smooth(rdp(r.pts, 0.8)); return { points, length: lenOf(points), comp: r.comp }; })
    .filter((s) => s.length >= MIN_STROKE);
  strokes.sort((a, b) => b.length - a.length);
  strokes = strokes.slice(0, MAX_STROKES);

  // Order: biggest group first; inside a group nearest-neighbour with stroke reversal.
  const area = (c: number) => { const b = compBox[c]; return (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1); };
  const groups = new Map<number, typeof strokes>();
  for (const s of strokes) (groups.get(s.comp) || groups.set(s.comp, []).get(s.comp)!).push(s);
  const pending = [...groups.keys()];
  const ordered: Stroke[] = [];
  let at: Pt = [w / 2, 0];
  while (pending.length) {
    const biggest = Math.max(...pending.map(area));
    let pick = -1, best = Infinity;
    for (let k = 0; k < pending.length; k++) {
      if (area(pending[k]) < biggest * 0.35) continue;
      const b = compBox[pending[k]];
      const d = Math.hypot((b.minX + b.maxX) / 2 - at[0], (b.minY + b.maxY) / 2 - at[1]);
      if (d < best) { best = d; pick = k; }
    }
    const pool = groups.get(pending.splice(pick, 1)[0])!.slice();
    // Start the group with its longest stroke (the main contour).
    let first = true;
    while (pool.length) {
      let bi = 0, bd = Infinity, rev = false;
      if (!first) {
        for (let i = 0; i < pool.length; i++) {
          const p = pool[i].points, d0 = Math.hypot(p[0][0] - at[0], p[0][1] - at[1]), d1 = Math.hypot(p[p.length - 1][0] - at[0], p[p.length - 1][1] - at[1]);
          if (d0 < bd) { bd = d0; bi = i; rev = false; }
          if (d1 < bd) { bd = d1; bi = i; rev = true; }
        }
      }
      first = false;
      const s = pool.splice(bi, 1)[0];
      const points = rev ? s.points.slice().reverse() : s.points;
      ordered.push({ points, length: s.length });
      at = points[points.length - 1];
    }
  }
  return { strokes: ordered, width: w, height: h, penWidth };
}
