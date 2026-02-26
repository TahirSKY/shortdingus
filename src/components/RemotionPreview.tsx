import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Play, Pause, RotateCcw, AlertCircle, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { evaluateCode, type EvalResult, type EvalError } from "@/lib/code-evaluator";
import type { ParsedFile } from "@/lib/code-parser";
import type { DetectedConfig } from "@/lib/detect-config";

interface RemotionPreviewProps {
  parsedFiles: ParsedFile[];
  detectedConfig: DetectedConfig;
  error: string | null;
}

const RemotionPreview = ({ parsedFiles, detectedConfig, error: externalError }: RemotionPreviewProps) => {
  const [evalResult, setEvalResult] = useState<EvalResult | EvalError | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const playerRef = useRef<PlayerRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fps = detectedConfig?.fps || 30;
  const durationInFrames = detectedConfig?.durationInFrames || (detectedConfig?.durationInSeconds ? detectedConfig.durationInSeconds * fps : 150);
  const width = detectedConfig?.width || 1920;
  const height = detectedConfig?.height || 1080;

  // Debounced evaluation when code changes
  useEffect(() => {
    if (parsedFiles.length === 0) {
      setEvalResult(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsEvaluating(true);

    debounceRef.current = setTimeout(async () => {
      const result = await evaluateCode(parsedFiles);
      setEvalResult(result);
      setIsEvaluating(false);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [parsedFiles]);

  // Sync play state with player
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onFrameUpdate = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentFrame(0);
    };

    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("frameupdate", onFrameUpdate as any);
    player.addEventListener("ended", onEnded);

    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("frameupdate", onFrameUpdate as any);
      player.removeEventListener("ended", onEnded);
    };
  }, [evalResult]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying]);

  const restart = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(0);
    player.play();
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(value[0]);
    setCurrentFrame(value[0]);
  }, []);

  const formatTime = (frame: number) => {
    const seconds = frame / fps;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const displayError = externalError || (evalResult && evalResult.error);
  const hasCode = parsedFiles.length > 0;
  const component = evalResult && !evalResult.error ? (evalResult as EvalResult).component : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-foreground">Live Preview</span>
          {isEvaluating && (
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
        </div>
        {component && (
          <span className="text-xs text-muted-foreground font-mono">
            {fps}fps · {durationInFrames}f · {width}×{height}
          </span>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {displayError ? (
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="font-mono text-xs mt-2 whitespace-pre-wrap max-h-40 overflow-auto">
              {displayError}
            </AlertDescription>
          </Alert>
        ) : component ? (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="rounded-lg overflow-hidden border border-border shadow-lg bg-black"
              style={{
                aspectRatio: `${width}/${height}`,
                maxHeight: "100%",
                maxWidth: "100%",
                width: height > width ? "auto" : "100%",
                height: height > width ? "100%" : "auto",
              }}
            >
              <Player
                ref={playerRef}
                component={component}
                compositionWidth={width}
                compositionHeight={height}
                durationInFrames={durationInFrames}
                fps={fps}
                numberOfSharedAudioTags={20}
                style={{ width: "100%", height: "100%" }}
                controls={false}
              />
            </div>
          </div>
        ) : hasCode && isEvaluating ? (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary/40 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Compiling preview…</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 animate-float">
              <Film className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Paste code or load a template to see a preview
            </p>
          </div>
        )}
      </div>

      {/* Playback controls */}
      {component && (
        <div className="px-4 py-3 border-t border-border bg-card/50 space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={restart}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <div className="flex-1">
              <Slider
                value={[currentFrame]}
                min={0}
                max={durationInFrames - 1}
                step={1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground min-w-[70px] text-right">
              {formatTime(currentFrame)} / {formatTime(durationInFrames)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemotionPreview;
