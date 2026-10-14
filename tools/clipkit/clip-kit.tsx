/**
 * CLIP KIT — the reusable half of a house-style clipping composition.
 *
 * Every block here is byte-identical to code that has already rendered on Lambda
 * (extracted from clips/first-payout-spent-it-in-a-weekend.tsx and
 * clips/high-schooler-claims-150r-trades.tsx). Copy the blocks you need VERBATIM into a new
 * single-file composition; only the DATA and the creative sections change. That is what keeps
 * clips consistent AND fast: ~33 KB of this machinery is identical every time, so a new clip is
 * ~40 KB of real decisions instead of ~100 KB of retyping.
 *
 * Order in the assembled file (the kit depends on this):
 *   1 font gate        — Montserrat via FontFace + delayRender (no @remotion/google-fonts in package.json)
 *   2 DATA (per clip)  — FPS/DURATION/SOURCE/ASSETS/COLORS/LAYOUT/SEGMENTS/OFFSET_FRAMES/CAMERA
 *   3 WORDS (per clip) + repairWords + toClipWords
 *   4 normalizeWord + keyColorFor + speakerTag (per clip) + buildPages + CAPTION_PAGES + blackouts
 *   5 zoom             — EASES/clamp01/lerp/zoomAt (ZOOM_KEYS are per clip)
 *   6 SFX + music      — per clip
 *   7 helpers          — springs, springAt, exitAt, isBetween, shakeAt, panelStyle, strokeText, SVG glyphs
 *   8 camera           — ClipCamera, MUST stay between its markers: render-video replaces that block
 *   9 background       — terminal grid + scrolling candle silhouettes + vignette
 *   9b grade           — the house colour grade: a filter on the FOOTAGE wrapper + blend layers over
 *                        the picture and under every graphic (parts/grade.txt). Teal shadows, amber
 *                        highlights, vignette, three-phase grain. Flat CSS, no SVG filters.
 *  10 primitives       — Kicker / Big / Panel / Flag / Lane / WhiteFlash: every beat is one of these
 *  11 captions         — SpeakerChip, CaptionWord, CaptionsLayer (incl. the strike-through)
 *  12 audio            — AudioLayer (each SFX cue is capped at 3s)
 *  13 creative sections (per clip)
 *  14 main + CLIP_AUDIT export (tools/clipcheck/verify.mjs reads it)
 *
 * LAYOUT is a contract, not a suggestion — the zones must not overlap:
 *   chipTop..+chipHeight  a single persistent object (the clip's protagonist: a balance, a counter,
 *                         a status readout). Keep it LEFT if a brand bug owns the top-right.
 *   cardTop..cardBottom   one beat card at a time; declare every window in CLIP_AUDIT.blocks
 *   videoTop..+videoHeight  ClipCamera's wide box exactly: (1920 - 1080/srcAspect) * 0.4 = 525
 *   captionTop..captionBottom  captions; captionBottom <= 1580 (phone UI)
 *
 * Two traps this kit cannot save you from:
 *   · ClipCamera paints its own OPAQUE background, so anything drawn BEFORE it (the terminal
 *     background, say) never shows. Draw ambience after it, clipped to the zones the letterboxed
 *     band does not occupy, and hide it in "s"/"p" modes where the picture is full-bleed.
 *   · ClipCamera's zoom prop is ignored in "w" mode. A clip that is mostly wide needs its own push
 *     on a wrapper OUTSIDE the marker block (see clips/judge-reads-body-language… pushAt).
 */

// ==== KIT: font (verbatim) ====

// ─────────────────────────────────────────────────────────────
// 1. FONT — Montserrat, loaded through the FontFace API and gated with delayRender.
//    A bare CSS @import can paint frames before the font arrives on Lambda and silently
//    fall back to Impact, so the render waits for the real woff2 (6s safety net).
// ─────────────────────────────────────────────────────────────

const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=block";
const FONT_CSS = `@import url('${FONT_CSS_URL}');`;
const FONT = "'Montserrat', Impact, sans-serif";
const MONO_FONT = '"Courier New", Courier, monospace';

const useMontserrat = () => {
  const [handle] = useState(() => delayRender("Loading Montserrat"));
  useEffect(() => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        continueRender(handle);
      }
    };
    const safety = setTimeout(done, 6000);
    (async () => {
      const css = await fetch(FONT_CSS_URL).then((r) => r.text());
      const jobs = [];
      (css.match(/@font-face\s*{[^}]*}/g) || []).forEach((block) => {
        if (/unicode-range/.test(block) && !/U\+0000-00FF/.test(block)) return; // latin subset only
        const weight = /font-weight:\s*(\d+)/.exec(block);
        const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block);
        if (!weight || !url) return;
        const face = new FontFace("Montserrat", `url(${url[1]})`, {
          weight: weight[1],
          style: "normal",
        });
        document.fonts.add(face);
        jobs.push(face.load());
      });
      await Promise.all(jobs);
      done();
    })().catch(done);
    return () => {
      clearTimeout(safety);
      done();
    };
  }, [handle]);
};

// ==== KIT: repairWords (verbatim) ====
const repairWords = (list) => {
  const out = list.map(([text, s, e, speaker]) => ({ text, s, e, orig: s, speaker }));
  const solid = (w) => w.e - w.s >= 0.05;
  let i = 0;
  while (i < out.length) {
    if (!solid(out[i])) {
      let j = i;
      while (j + 1 < out.length && !solid(out[j + 1])) j++;
      const runStart = out[i].s;
      const next = out[j + 1];
      const runEnd = Math.max(out[j].e + 0.06, next ? next.s : out[j].e + 0.24);
      const step = (runEnd - runStart) / (j - i + 1);
      for (let k = i; k <= j; k++) {
        out[k].s = runStart + (k - i) * step;
        out[k].e = runStart + (k - i + 1) * step;
      }
      i = j + 1;
    } else i++;
  }
  for (let k = 0; k < out.length; k++) {
    if (k > 0 && out[k].s < out[k - 1].e) out[k].s = Math.min(out[k - 1].e, out[k].orig + 0.4);
    out[k].e = Math.max(out[k].e, out[k].s + 0.08);
  }
  return out;
};

// ==== KIT: normalizeWord (verbatim) ====
const normalizeWord = (w) =>
  w
    .toLowerCase()
    .replace(/[^a-z0-9$%.]/g, "")
    .replace(/^\.+|\.+$/g, "");

// ==== KIT: buildPages (verbatim) ====
const buildPages = (words) => {
  const pages = [];
  let current = [];
  words.forEach((word, i) => {
    const prev = words[i - 1];
    const breakHere =
      current.length > 0 &&
      (current.length >= MAX_WORDS_PER_PAGE || prev.speaker !== word.speaker || word.start - prev.end > PAGE_GAP_BREAK || /[.?!]$/.test(prev.text) || (current.length >= 3 && /[,—]$/.test(prev.text)));
    if (breakHere) {
      pages.push(current);
      current = [];
    }
    current.push(word);
  });
  if (current.length) pages.push(current);
  return pages.map((ws, i) => {
    const next = pages[i + 1];
    const last = ws[ws.length - 1];
    const holdEnd = next ? Math.min(next[0].start, last.end + 0.5) : last.end + 0.5;
    return { words: ws, start: ws[0].start, end: holdEnd, speaker: ws[0].speaker };
  });
};

// ==== KIT: zoom (verbatim) ====
const EASES = {
  snap: Easing.out(Easing.back(2.2)),
  smooth: Easing.inOut(Easing.cubic),
  linear: Easing.inOut(Easing.sin),
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, p) => a + (b - a) * p;

const zoomAt = (frame) => {
  const t = frame / FPS;
  if (t <= ZOOM_KEYS[0].t) return ZOOM_KEYS[0].z;
  let startVal = ZOOM_KEYS[0].z;
  for (let i = 0; i < ZOOM_KEYS.length; i++) {
    const key = ZOOM_KEYS[i];
    const next = ZOOM_KEYS[i + 1];
    const valueAt = (tau) => {
      const p = key.dur <= 0 ? 1 : clamp01((tau - key.t) / key.dur);
      return lerp(startVal, key.z, EASES[key.ease](p));
    };
    if (!next || t < next.t) return valueAt(t);
    startVal = valueAt(next.t);
  }
  return startVal;
};

// ==== KIT: helpers (verbatim) ====

// ─────────────────────────────────────────────────────────────
// 7. MOTION HELPERS
// ─────────────────────────────────────────────────────────────

const sec = (t) => Math.round(t * FPS);

const SPRING_IN = { damping: 13, stiffness: 160, mass: 0.8 };
const SPRING_SNAP = { damping: 14, stiffness: 300, mass: 0.7 };
const SPRING_STAMP = { damping: 9, stiffness: 220, mass: 0.9 };

const springAt = (frame, t, config = SPRING_IN) => spring({ frame: frame - sec(t), fps: FPS, config });

const exitAt = (frame, t, frames = 7) =>
  interpolate(frame, [sec(t) - frames, sec(t)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const isBetween = (frame, a, b) => frame >= sec(a) && frame < sec(b);

const shakeAt = (frame, t, frames = 6, amp = 14) => {
  const local = frame - sec(t);
  if (local < 0 || local >= frames) return { x: 0, y: 0 };
  const decay = 1 - local / frames;
  return {
    x: Math.sin(local * 2.7 + 1.3) * amp * decay,
    y: Math.cos(local * 3.1 + 0.4) * amp * decay,
  };
};

const panelStyle = {
  background: COLORS.panel,
  border: `2px solid ${COLORS.panelBorder}`,
  borderRadius: 28,
  boxShadow: COLORS.shadow,
};

const strokeText = (strokePx = 10) => ({ WebkitTextStroke: `${strokePx}px #000`, paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(0,0,0,0.55), 0 10px 26px rgba(0,0,0,0.6)" });

// Small drawn icons (no emoji dependency): rewind arrows, a down arrow, a flame.
const RewindGlyph = ({ size = 30, color = COLORS.white }) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 30 21" style={{ display: "block" }}>
    <path d="M14 2 L14 19 L2 10.5 Z" fill={color} />
    <path d="M28 2 L28 19 L16 10.5 Z" fill={color} />
  </svg>
);

const ArrowDownGlyph = ({ size = 34, color = COLORS.yellow }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M12 2 L12 17 M5 12 L12 20 L19 12" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FlameGlyph = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.3-2-.3-2 2 1.5 3.3 3.4 3.3 5.6A6 6 0 0 1 6 15c0-5 6-6 6-13z" fill="#FF7A18" />
    <path d="M12 12c.6 1.8-1.2 2.3-1.2 4a1.9 1.9 0 0 0 3.8 0c0-1.6-2.6-2.2-2.6-4z" fill={COLORS.yellow} />
  </svg>
);

const CheckGlyph = ({ size = 34, color = COLORS.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M4 13 L9.5 18.5 L20 6" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CrossGlyph = ({ size = 34, color = COLORS.red }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M5 5 L19 19 M19 5 L5 19" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" />
  </svg>
);

// ==== KIT: camera (verbatim) ====
// ---- ClipCamera (paste as-is; do not rewrite the maths) ----
// Picture streams muted from the original; sound plays from the source's small audio copy (&part=audio).
// CAMERA keys: { t: clip seconds, m: "s" single | "p" split | "w" wide, a/b: [x,y,w,h] source fractions, cut?: 1 }
const lerpRect = (p, q, k) => p.map((v, i) => v + (q[i] - v) * k);
const camAt = (keys, t) => {
  let i = 0;
  for (let j = 0; j < keys.length; j++) { if (keys[j].t <= t) i = j; else break; }
  const k = keys[i], prev = keys[i - 1];
  if (!prev || k.cut || prev.m !== k.m || k.m === 'w') return k;
  const p = Math.min(1, (t - k.t) / 0.45), e = 1 - Math.pow(1 - p, 3);
  return { ...k, a: lerpRect(prev.a, k.a, e), b: k.b && prev.b ? lerpRect(prev.b, k.b, e) : k.b };
};
const CropView = ({ src, rect, startFrom, endAt, muted, style, zoom = 1 }) => {
  const [x, y, w, h] = rect;
  const cx = x + w / 2, cy = y + h / 2, zw = w / zoom, zh = h / zoom;
  const zx = Math.max(0, Math.min(1 - zw, cx - zw / 2)), zy = Math.max(0, Math.min(1 - zh, cy - zh / 2));
  return (
    <div style={{ position: 'absolute', overflow: 'hidden', ...style }}>
      <Video src={src} startFrom={startFrom} endAt={endAt} muted
        style={{ position: 'absolute', width: (100 / zw) + '%', height: (100 / zh) + '%', left: (-zx / zw * 100) + '%', top: (-zy / zh * 100) + '%', objectFit: 'fill', maxWidth: 'none' }} />
    </div>
  );
};
// zoom: optional extra punch-in (1 = none, 1.15 = punch). Stays inside the tracked window, never shows outside the frame.
const ClipCamera = ({ src, segments, camera, srcAspect = 16 / 9, zoom = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  let off = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b0b0f' }}>
      {segments.map((s, i) => {
        const from = Math.round(off * fps), len = Math.round((s.out - s.in) * fps);
        off += s.out - s.in;
        if (frame < from || frame >= from + len) return null;
        const t = frame / fps, k = camAt(camera, t);
        const sf = Math.round(s.in * fps), ea = Math.round(s.out * fps);
        const local = { startFrom: sf + (frame - from), endAt: ea };
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            <Audio src={src + '&part=audio'} startFrom={sf} endAt={ea} />
            {k.m === 's' && <CropView src={src} rect={k.a} startFrom={sf} endAt={ea} zoom={zoom} style={{ inset: 0 }} />}
            {k.m === 'p' && <>
              <CropView src={src} rect={k.a} startFrom={sf} endAt={ea} zoom={zoom} style={{ left: 0, top: 0, width: '100%', height: '50%' }} />
              <CropView src={src} rect={k.b} startFrom={sf} endAt={ea} zoom={zoom} muted style={{ left: 0, top: '50%', width: '100%', height: '50%' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 6, marginTop: -3, background: '#0b0b0f' }} />
            </>}
            {k.m === 'w' && <CropView src={src} rect={[0, 0, 1, 1]} startFrom={sf} endAt={ea} style={{ left: 0, width: '100%', top: (height - width / srcAspect) * 0.4, height: width / srcAspect }} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
// ---- end ClipCamera ----

// ==== KIT: background (verbatim) ====

// ─────────────────────────────────────────────────────────────
// 9. TERMINAL BACKGROUND — grid, scrolling candle silhouettes, vignette
// ─────────────────────────────────────────────────────────────

const seeded = (i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const CANDLE_COUNT = 40;
const CANDLE_SPACING = 36;
const CANDLE_STRIP_WIDTH = CANDLE_COUNT * CANDLE_SPACING;

const CANDLES = (() => {
  let mid = 0;
  return Array.from({ length: CANDLE_COUNT }, (_, i) => {
    const up = seeded(i * 3.1) > 0.45;
    const body = 24 + seeded(i * 7.7) * 110;
    const wick = body + 20 + seeded(i * 5.3) * 60;
    mid += (up ? -1 : 1) * body * 0.35;
    mid = Math.max(-70, Math.min(70, mid));
    return { up, body, wick, mid };
  });
})();

const CandleStrip = ({ y, speed, opacity, flip = false }) => {
  const frame = useCurrentFrame();
  const offset = -((frame * speed) % CANDLE_STRIP_WIDTH);
  const renderStrip = (key, dx) => (
    <div key={key} style={{ position: "absolute", left: dx, top: 0, width: CANDLE_STRIP_WIDTH, height: 300 }}>
      {CANDLES.map((c, i) => {
        const color = c.up ? COLORS.green : COLORS.red;
        const cx = i * CANDLE_SPACING + CANDLE_SPACING / 2;
        const cy = 150 + c.mid;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: cx - 1.5, top: cy - c.wick / 2, width: 3, height: c.wick, background: color }} />
            <div style={{ position: "absolute", left: cx - 11, top: cy - c.body / 2, width: 22, height: c.body, background: color, borderRadius: 3 }} />
          </React.Fragment>
        );
      })}
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: WIDTH, height: 300, overflow: "hidden", opacity, transform: flip ? "scaleY(-1)" : undefined }}>
      {renderStrip("a", offset)}
      {renderStrip("b", offset + CANDLE_STRIP_WIDTH)}
    </div>
  );
};

const TerminalBackground = () => {
  const frame = useCurrentFrame();
  const gridShift = (frame * 0.4) % 60;
  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.gridLine} 2px, transparent 2px), linear-gradient(90deg, ${COLORS.gridLine} 2px, transparent 2px)`,
          backgroundSize: "60px 60px",
          backgroundPosition: `${-gridShift}px 0px`,
        }}
      />
      <CandleStrip y={1560} speed={0.9} opacity={0.09} />
      <CandleStrip y={-40} speed={0.6} opacity={0.05} flip />
      <div
        style={{
          position: "absolute",
          left: -100,
          right: -100,
          top: LAYOUT.videoTop - 120,
          height: LAYOUT.videoHeight + 240,
          background: "radial-gradient(ellipse at center, rgba(0,230,118,0.07) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)" }} />
    </AbsoluteFill>
  );
};

// ==== KIT: primitives (verbatim) ====

// ── PRIMITIVES ────────────────────────────────────────────────
// Every beat in a clip is one of these six. That is what keeps the file small and the spacing
// consistent: a Panel always owns the card lane, a Flag always owns a corner of the picture.
const Kicker = ({ children, color = "rgba(255,255,255,0.6)", size = 28, align = "left" }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: 5, color, textAlign: align }}>{children}</div>
);

const Big = ({ children, color = COLORS.white, size = 82, stroke = 9, align = "left" }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.03, color, textAlign: align, ...strokeText(stroke) }}>{children}</div>
);

const Panel = ({ at, out, top = LAYOUT.cardTop, left = 50, right = 50, border = COLORS.panelBorder, rotate = 0, cfg = SPRING_IN, from = 1.4, amp = 0, children }) => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, at, out)) return null;
  const enter = springAt(frame, at, cfg);
  const shake = amp ? shakeAt(frame, at, 5, amp) : { x: 0, y: 0 };
  return (
    <div style={{ position: "absolute", left, right, top, opacity: exitAt(frame, out, 6) * clamp01(enter * 3), transform: `translate(${shake.x}px, ${shake.y}px) scale(${interpolate(enter, [0, 1], [from, 1])}) rotate(${rotate}deg)`, ...panelStyle, border: `3px solid ${border}`, padding: "20px 28px 24px" }}>
      {children}
    </div>
  );
};

const Flag = ({ at, out, top, left, right, color = COLORS.white, size = 30, from = -70, bg = "rgba(0,0,0,0.8)", children }) => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, at, out)) return null;
  const enter = springAt(frame, at, SPRING_SNAP);
  return (
    <div style={{ position: "absolute", top, left, right, display: "flex", alignItems: "center", gap: 14, padding: "10px 22px", background: bg, borderRadius: 12, border: `2px solid ${color}`, fontFamily: MONO_FONT, fontWeight: 700, fontSize: size, letterSpacing: 2, color, opacity: exitAt(frame, out, 6) * clamp01(enter * 2), transform: `translateX(${interpolate(enter, [0, 1], [from, 0])}px)`, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};

const Lane = ({ label, value, mark, color = COLORS.white, p, active = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 22px", borderRadius: 18, background: active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", border: `3px solid ${active ? color : "rgba(255,255,255,0.12)"}`, opacity: clamp01(p * 2), transform: `translateX(${interpolate(p, [0, 1], [active ? 240 : -240, 0])}px)` }}>
    <Kicker size={24} color="rgba(255,255,255,0.55)">{label}</Kicker>
    <div style={{ flex: 1, fontFamily: FONT, fontWeight: 900, fontSize: 42, color: active ? color : "rgba(255,255,255,0.7)" }}>{value}</div>
    {mark ? <div style={{ transform: `scale(${interpolate(p, [0, 1], [2, 1])})` }}>{mark}</div> : null}
  </div>
);

const WhiteFlash = ({ at, frames = 4, peak = 0.95, color = COLORS.white }) => {
  const frame = useCurrentFrame();
  const local = frame - sec(at);
  if (local < 0 || local >= frames) return null;
  return <AbsoluteFill style={{ background: color, opacity: peak * (1 - local / frames), pointerEvents: "none" }} />;
};

// ==== KIT: captions (verbatim) ====

// ─────────────────────────────────────────────────────────────
// 11. CAPTIONS — speaker chip + word-by-word pages + the strike-through
// ─────────────────────────────────────────────────────────────

const SpeakerChip = ({ speaker }) => {
  const tag = speakerTag(speaker);
  const dot = tag === "JUDGE" ? COLORS.yellow : COLORS.green;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 20px",
        borderRadius: 999,
        background: "rgba(15,20,28,0.92)",
        border: `2px solid ${COLORS.panelBorder}`,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 26,
        letterSpacing: 4,
        color: COLORS.white,
        boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ width: 14, height: 14, borderRadius: 7, background: dot, boxShadow: `0 0 12px ${dot}` }} />
      {tag}
    </div>
  );
};

const CaptionWord = ({ word, active, spoken, frame }) => {
  const key = keyColorFor(word.text);
  const pop = active ? springAt(frame, word.start, SPRING_SNAP) : 0;
  const scale = active ? interpolate(pop, [0, 1], [1, 1.12]) : 1;
  const color = key ?? (active ? COLORS.yellow : COLORS.white);
  return (
    <span style={{ display: "inline-block", margin: "0 11px", transform: `scale(${scale}) translateY(${active ? -4 * pop : 0}px)`, color, opacity: spoken || active ? 1 : 0.88, ...strokeText(10) }}>
      {word.text.toUpperCase()}
    </span>
  );
};

const CaptionsLayer = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (isFreeze(t)) return null;
  const page = CAPTION_PAGES.find((p) => t >= p.start && t < p.end);
  if (!page) return null;

  const enter = springAt(frame, page.start, SPRING_SNAP);
  const pageScale = interpolate(enter, [0, 1], [0.88, 1]);
  const pageY = interpolate(enter, [0, 1], [22, 0]);
  const strikeP = t >= CAPTION_STRIKE.start && t < CAPTION_STRIKE.end ? clamp01((t - CAPTION_STRIKE.start) / 0.18) : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        top: LAYOUT.captionTop,
        height: LAYOUT.captionBottom - LAYOUT.captionTop,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        opacity: clamp01(enter * 1.6),
        transform: `translateY(${pageY}px) scale(${pageScale})`,
      }}
    >
      <SpeakerChip speaker={page.speaker} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", maxWidth: 980, fontFamily: FONT, fontWeight: 900, fontSize: 76, lineHeight: 1.12, textAlign: "center" }}>
          {page.words.map((w, i) => {
            const active = t >= w.start && t < Math.max(w.end, w.start + 0.12);
            const spoken = t >= w.end;
            return <CaptionWord key={`${page.start}-${i}`} word={w} active={active} spoken={spoken} frame={frame} />;
          })}
        </div>
        {strikeP > 0 ? (
          <div
            style={{
              position: "absolute",
              left: "-2%",
              top: "50%",
              height: 14,
              marginTop: -7,
              width: `${strikeP * 104}%`,
              background: COLORS.red,
              borderRadius: 7,
              transform: "rotate(-2deg)",
              boxShadow: "0 0 18px rgba(255,59,59,0.7)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

// ==== KIT: audio (verbatim) ====

// ─────────────────────────────────────────────────────────────
// 25. AUDIO — music bed (ducked, incl. the record stop) + SFX hits
// ─────────────────────────────────────────────────────────────

const AudioLayer = () => (
  <>
    <Audio src={ASSETS.music} volume={(f) => musicVolumeAt(f)} />
    {SFX.map((fx, i) => (
      <Sequence key={`sfx-${i}`} from={sec(fx.at)} durationInFrames={Math.max(1, Math.min(sec(3), DURATION - sec(fx.at)))} layout="none">
        <Audio src={fx.src} volume={fx.vol} />
      </Sequence>
    ))}
  </>
);
