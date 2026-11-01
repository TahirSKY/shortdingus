export const MARKER_RIG = {
  width: 1024, height: 1536, tip: [25, 82],
  // Entire opaque terminal cross-section touches the right/bottom image edges.
  cap: [[1024, 1212], [843, 1536], [1024, 1536]],
  scale: 0.8,
};

export function markerPose(x: number, y: number, width: number, height: number) {
  const scale = Math.min(width, height) / 1080 * MARKER_RIG.scale;
  const angle = width < height ? -45 : 20;
  return { x, y, scale, angle };
}

export function projectMarkerPoint(point: number[], pose: ReturnType<typeof markerPose>) {
  const a = pose.angle * Math.PI / 180, dx = (point[0] - MARKER_RIG.tip[0]) * pose.scale, dy = (point[1] - MARKER_RIG.tip[1]) * pose.scale;
  return [pose.x + dx * Math.cos(a) - dy * Math.sin(a), pose.y + dx * Math.sin(a) + dy * Math.cos(a)];
}

// Budget lift/travel inside the caller's requested duration. No frame history:
// AWS can render frames in any order and get identical contact/ink positions.
export function drawingTimeline(strokes: { points: number[][]; length: number }[], duration: number, boardScale: number) {
  const total = strokes.reduce((a, s) => a + s.length, 0);
  const travel = strokes.map((s, i) => {
    if (!i) return 0;
    const prev = strokes[i - 1].points.at(-1) ?? s.points[0];
    const gap = Math.hypot(s.points[0][0] - prev[0], s.points[0][1] - prev[1]) * boardScale;
    return gap < 3 ? 0 : Math.min(.32, .08 + gap / 3500);
  });
  const requested = travel.reduce((a, n) => a + n, 0);
  const budget = Math.min(requested, duration * .25);
  let at = 0;
  return strokes.map((s, i) => {
    const travelStart = at;
    at += requested ? travel[i] * budget / requested : 0;
    const start = at;
    at += (duration - budget) * s.length / Math.max(1, total);
    return { travelStart, start, end: at };
  });
}

export function drawingState(strokes: { points: number[][]; length: number; lengths: number[] }[], timeline: ReturnType<typeof drawingTimeline>, time: number) {
  const amounts = strokes.map((s, i) => Math.max(0, Math.min(1, (time - timeline[i].start) / Math.max(.00001, timeline[i].end - timeline[i].start))) * s.length);
  const i = timeline.findIndex(s => time >= s.travelStart && time < s.end);
  if (i < 0) return { amounts, pen: null, lifted: false };
  const s = strokes[i], timing = timeline[i];
  if (time < timing.start && i > 0) {
    const prev = strokes[i - 1].points.at(-1) ?? s.points[0];
    let p = (time - timing.travelStart) / Math.max(.00001, timing.start - timing.travelStart);
    p = p * p * (3 - 2 * p);
    return { amounts, pen: [prev[0] + (s.points[0][0] - prev[0]) * p, prev[1] + (s.points[0][1] - prev[1]) * p], lifted: true };
  }
  const d = amounts[i];
  for (let j = 1; j < s.points.length; j++) {
    if (s.lengths[j] >= d) {
      const p = (d - s.lengths[j - 1]) / Math.max(.00001, s.lengths[j] - s.lengths[j - 1]);
      return { amounts, pen: [s.points[j - 1][0] + (s.points[j][0] - s.points[j - 1][0]) * p, s.points[j - 1][1] + (s.points[j][1] - s.points[j - 1][1]) * p], lifted: false };
    }
  }
  return { amounts, pen: s.points.at(-1) ?? null, lifted: false };
}

export function markerRuntime() {
  return `const MARKER_RIG=${JSON.stringify(MARKER_RIG)};\n${markerPose.toString()}\n${drawingTimeline.toString()}\n${drawingState.toString()}\nfunction Marker({pen,board,lifted=false,exit=0}){if(!pen)return null;const pose=markerPose(board.x+pen[0]*board.scale,board.y+pen[1]*board.scale,WIDTH,HEIGHT);if(WIDTH<HEIGHT)pose.x+=exit*WIDTH*1.5;else pose.y+=exit*HEIGHT*1.5;return <Img src={HAND_EMBEDDED} style={{position:'absolute',left:pose.x,top:pose.y,width:MARKER_RIG.width*pose.scale,height:MARKER_RIG.height*pose.scale,maxWidth:'none',transformOrigin:'0 0',transform:\`rotate(\${pose.angle}deg) translate(\${-MARKER_RIG.tip[0]*pose.scale}px,\${-MARKER_RIG.tip[1]*pose.scale}px)\`,filter:lifted?'drop-shadow(2px 5px 3px rgba(0,0,0,.13))':'none',pointerEvents:'none'}}/>;}\nfunction HandMotion({state,strokes,board,t,end}){if(t>=end+.25)return null;const last=strokes[strokes.length-1]?.points;return <Marker pen={state.pen||(t>=end?last?.[last.length-1]:null)} board={board} lifted={state.lifted||t>=end} exit={ease((t-end)/.25)}/>;}`;
}