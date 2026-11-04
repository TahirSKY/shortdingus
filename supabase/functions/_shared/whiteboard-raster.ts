/** Paint each frame from geometry, never from a changing SVG image decoder. */
export function paintWhiteboard(ctx: CanvasRenderingContext2D, width: number, height: number, layers: any[], caption: any = null, progress: any = null) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  for (const layer of layers) {
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.translate(layer.board.x, layer.board.y);
    ctx.scale(layer.board.scale, layer.board.scale);
    ctx.strokeStyle = '#202829';
    ctx.lineWidth = layer.penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < layer.strokes.length; i++) {
      const s = layer.strokes[i];
      const amount = Math.min(s.length, layer.amounts[i] || 0);
      if (amount <= 0 || s.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0], s.points[0][1]);
      let left = amount;
      for (let j = 1; j < s.points.length && left > 0; j++) {
        const a = s.points[j - 1], b = s.points[j];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!length) continue;
        const ratio = Math.min(1, left / length);
        ctx.lineTo(a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio);
        left -= length;
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (caption) {
    ctx.fillStyle = '#202829';
    ctx.font = `700 ${caption.size}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(caption.text, width / 2, caption.y);
  }
  if (progress) {
    ctx.fillStyle = '#12aeaa';
    ctx.fillRect(progress.x, height - 24, progress.width, 6);
  }
}

export function whiteboardRasterRuntime() {
  return `${paintWhiteboard.toString()}
function DrawingCanvas({layers,caption=null,progress=null}){
 const ref=React.useRef(null);
 React.useLayoutEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Whiteboard canvas unavailable');paintWhiteboard(ctx,WIDTH,HEIGHT,layers,caption,progress);},[layers,caption,progress]);
 return <canvas ref={ref} width={WIDTH} height={HEIGHT} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;
}`;
}