import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Download, Zap, Code2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Code2,
    title: "Paste Your Code",
    description: "Drop your entire Remotion project in one block — multi-file support included.",
  },
  {
    icon: Play,
    title: "Instant Preview",
    description: "See your video come alive in real-time right in the browser. No build step needed.",
  },
  {
    icon: Download,
    title: "One-Click Download",
    description: "Render production-quality MP4 videos via AWS Lambda with a single click.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-base sm:text-lg font-bold text-foreground">Remotion Playground</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/examples" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
            Examples
          </Link>
          <Link to="/renders" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
            Renders
          </Link>
          <Link to="/studio" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
            AI Studio
          </Link>
          <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 transition-opacity border-0 text-xs sm:text-sm">
            <Link to="/playground">Open Playground</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-12 sm:pt-20 pb-20 sm:pb-32 max-w-7xl mx-auto text-center">
        {/* Glow orbs */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-10 left-1/2 w-48 h-48 bg-accent/15 rounded-full blur-[80px] animate-pulse-glow" style={{ animationDelay: "0.5s" }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted border border-border mb-8 text-sm text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-accent" />
            Powered by Remotion + AWS Lambda
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
            Paste code.{" "}
            <span className="text-gradient">See video.</span>
            <br />
            Download.
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            The fastest way to preview and render Remotion videos. No setup, no CLI, no hassle — just paste your code and go.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity border-0 text-base px-8 glow-primary">
              <Link to="/playground">
                Try it now <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link to="/examples">Browse examples</Link>
            </Button>
          </div>
        </motion.div>

        {/* Floating code mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative z-10 mt-20 mx-auto max-w-3xl"
        >
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-1 glow-primary">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-secondary/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <div className="w-3 h-3 rounded-full bg-primary/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">playground.tsx</span>
            </div>
            <div className="p-6 font-mono text-sm text-left space-y-1">
              <div><span className="text-primary">import</span> <span className="text-accent">{"{ useCurrentFrame }"}</span> <span className="text-primary">from</span> <span className="text-secondary">"remotion"</span>;</div>
              <div className="h-2" />
              <div><span className="text-primary">export const</span> <span className="text-accent">MyVideo</span> = () =&gt; {"{"}</div>
              <div className="pl-4"><span className="text-primary">const</span> frame = <span className="text-accent">useCurrentFrame</span>();</div>
              <div className="pl-4"><span className="text-primary">return</span> (</div>
              <div className="pl-8">&lt;<span className="text-secondary">div</span> style={"{{ opacity: frame / 30 }}"}&gt;</div>
              <div className="pl-12 text-foreground/70">🎬 Hello Remotion!</div>
              <div className="pl-8">&lt;/<span className="text-secondary">div</span>&gt;</div>
              <div className="pl-4">);</div>
              <div>{"}"};</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:glow-primary transition-shadow">
                <feature.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border text-center text-sm text-muted-foreground">
        Built with ❤️ using Remotion & AWS Lambda
      </footer>
    </div>
  );
};

export default Index;
