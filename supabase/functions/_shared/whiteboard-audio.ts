// Reuse one shared recording; no paid sound generation per drawing.
export const DRAWING_SOUND_ASSET_ID = 'bf810aca-6f5a-418c-9f60-bb715550934c';
export function drawingSoundVolume(timeline: { start: number; end: number }[], time: number) {
  const stroke = timeline.find(s => time >= s.start && time < s.end);
  if (!stroke) return 0;
  return .22 * Math.max(0, Math.min(1, (time - stroke.start) / .025, (stroke.end - time) / .025));
}
export function drawingAudioRuntime(url: string, enabled = true) {
  return `const DRAWING_SOUND=${enabled ? JSON.stringify(url) : 'null'};\n${drawingSoundVolume.toString()}`;
}