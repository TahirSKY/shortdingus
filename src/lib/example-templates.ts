export interface ExampleTemplate {
  id: string;
  title: string;
  description: string;
  emoji: string;
  code: string;
}

export const starterTemplate: ExampleTemplate = {
  id: "starter",
  title: "Starter Template",
  description: "Two scenes with transitions — ready to render via Lambda.",
  emoji: "🎬",
  code: `// --- file: Intro.tsx ---
import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from "remotion";

export const Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const subtitleOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [30, 60], [0, 300], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          transform: \`scale(\${titleScale})\`,
          color: "white",
          fontSize: 96,
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: -2,
        }}
      >
        ✦ My Brand
      </div>

      <div
        style={{
          width: lineWidth,
          height: 3,
          background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
          borderRadius: 2,
        }}
      />

      <div
        style={{
          opacity: subtitleOpacity,
          color: "rgba(255,255,255,0.6)",
          fontSize: 28,
          fontFamily: "sans-serif",
          letterSpacing: 6,
          textTransform: "uppercase",
        }}
      >
        The Story Begins
      </div>
    </AbsoluteFill>
  );
};

// --- file: MainScene.tsx ---
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

const STATS = [
  { label: "Projects Shipped", value: "128" },
  { label: "Happy Clients", value: "94%" },
  { label: "Awards Won", value: "12" },
];

export const MainScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: \`rgba(10, 10, 20, \${bgOpacity})\`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 60,
        padding: 80,
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: 56,
          fontWeight: 800,
          fontFamily: "sans-serif",
          textAlign: "center",
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        What We've Built
      </div>

      <div style={{ display: "flex", gap: 60 }}>
        {STATS.map((stat, i) => {
          const cardScale = spring({
            frame: frame - i * 12,
            fps,
            config: { damping: 16, mass: 0.5 },
          });
          return (
            <div
              key={stat.label}
              style={{
                transform: \`scale(\${cardScale})\`,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(167,139,250,0.3)",
                borderRadius: 20,
                padding: "40px 50px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ color: "#a78bfa", fontSize: 72, fontWeight: 900, fontFamily: "sans-serif" }}>
                {stat.value}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, fontFamily: "sans-serif", marginTop: 8 }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- file: Root.tsx ---
import { Composition } from "remotion";
import { Intro } from "./Intro";
import { MainScene } from "./MainScene";

/* __REMOTION_CONFIG__ { "fps": 30, "durationInFrames": 150, "width": 1920, "height": 1080 } */

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MainScene"
        component={MainScene}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};`,
};

export const exampleTemplates: ExampleTemplate[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "A simple fade-in text animation — the classic starter.",
    emoji: "👋",
    code: `// --- file: MyVideo.tsx ---
import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring } from "remotion";

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, config: { damping: 20 } });
  const scale = spring({ frame: frame - 10, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: \`scale(\${scale})\`,
          color: "white",
          fontSize: 80,
          fontWeight: "bold",
          fontFamily: "sans-serif",
        }}
      >
        🎬 Hello Remotion!
      </div>
    </AbsoluteFill>
  );
};

// --- file: Root.tsx ---
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};`,
  },
  {
    id: "counter",
    title: "Animated Counter",
    description: "A smooth counting animation from 0 to 100.",
    emoji: "🔢",
    code: `// --- file: Counter.tsx ---
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } from "remotion";

export const Counter = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const count = Math.round(
    interpolate(frame, [0, durationInFrames - 30], [0, 100], {
      extrapolateRight: "clamp",
    })
  );

  const scale = interpolate(frame, [0, 15], [0.5, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: \`scale(\${scale})\`,
          color: "white",
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 140, fontWeight: "bold", lineHeight: 1 }}>
          {count}
        </div>
        <div style={{ fontSize: 32, opacity: 0.8, marginTop: 10 }}>
          percent complete
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- file: Root.tsx ---
import { Composition } from "remotion";
import { Counter } from "./Counter";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Counter"
      component={Counter}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};`,
  },
  {
    id: "logo-reveal",
    title: "Logo Reveal",
    description: "A cinematic logo reveal with scale and glow effects.",
    emoji: "✨",
    code: `// --- file: LogoReveal.tsx ---
import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from "remotion";

export const LogoReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const rotate = interpolate(frame, [0, 30], [-180, 0], {
    extrapolateRight: "clamp",
  });
  const glowOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: \`scale(\${scale}) rotate(\${rotate}deg)\`,
          fontSize: 120,
          filter: \`drop-shadow(0 0 \${glowOpacity * 40}px rgba(168, 85, 247, \${glowOpacity}))\`,
        }}
      >
        🚀
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "35%",
          color: "white",
          fontSize: 36,
          fontWeight: "bold",
          fontFamily: "sans-serif",
          opacity: interpolate(frame, [40, 60], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        Your Brand Here
      </div>
    </AbsoluteFill>
  );
};

// --- file: Root.tsx ---
import { Composition } from "remotion";
import { LogoReveal } from "./LogoReveal";

export const RemotionRoot = () => {
  return (
    <Composition
      id="LogoReveal"
      component={LogoReveal}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};`,
  },
  {
    id: "text-typewriter",
    title: "Typewriter Effect",
    description: "Text that types itself character by character.",
    emoji: "⌨️",
    code: `// --- file: Typewriter.tsx ---
import { useCurrentFrame, AbsoluteFill, interpolate } from "remotion";

export const Typewriter = () => {
  const frame = useCurrentFrame();
  const text = "Welcome to the future of video.";
  
  const charsToShow = Math.floor(
    interpolate(frame, [10, 70], [0, text.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const cursorOpacity = Math.round(frame / 15) % 2 === 0 ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          color: "#e2e8f0",
          fontSize: 56,
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      >
        {text.slice(0, charsToShow)}
        <span style={{ opacity: cursorOpacity, color: "#a78bfa" }}>|</span>
      </div>
    </AbsoluteFill>
  );
};

// --- file: Root.tsx ---
import { Composition } from "remotion";
import { Typewriter } from "./Typewriter";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Typewriter"
      component={Typewriter}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};`,
  },
];
