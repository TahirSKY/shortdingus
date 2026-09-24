import { useEffect } from "react";

export default function VideoAnalyzerPage() {
  useEffect(() => {
    document.title = "Brainbank Video Analyzer — Gemini 1.5";
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0b", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 900, letterSpacing: -2 }}>
          <span style={{ color: "#00ff9d" }}>●</span> Brainbank Video Analyzer
        </h1>
        <p style={{ color: "#777", marginTop: 10, fontSize: 15 }}>
          Gemini 1.5 video understanding — timecoded beats, scenes, emotion
        </p>
        <a
          href="/video-analyzer.html"
          style={{
            display: "inline-block", marginTop: 24, padding: "14px 28px",
            background: "#00ff9d", color: "#000", borderRadius: 100,
            fontWeight: 800, textDecoration: "none", fontSize: 15,
          }}
        >
          Open Full Analyzer Page →
        </a>
        <div style={{ marginTop: 40, color: "#aaa", fontSize: 13, maxWidth: 600, margin: "40px auto" }}>
          <p><strong>How it works:</strong> Upload your video clip → Gemini watches with vision → gets timecoded beats (0:03 dog enters, 0:12 voice builds). Then when you ask me to edit at 0:12, I know exactly what footage to use.</p>
          <p style={{ marginTop: 12 }}><strong>Page is also available at:</strong> <code>/video-analyzer.html</code> (direct static file)</p>
        </div>
      </div>
      <iframe
        src="/video-analyzer.html"
        title="Video Analyzer"
        style={{ width: "100%", height: "85vh", border: "none", background: "#0a0a0b" }}
      />
    </div>
  );
}
