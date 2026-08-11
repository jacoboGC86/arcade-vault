"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { GameEngine, GameEngineFactory, GameEngineState } from "@/lib/games/engine";
import type { GameTheme } from "@/lib/games/theme";

export interface GameCanvasHandle {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  forceGameOver: () => void;
}

interface GameCanvasProps {
  engineFactory: GameEngineFactory;
  onStateChange: (state: GameEngineState) => void;
  onGameOver: (finalScore: number) => void;
  hideFocusOverlay?: boolean;
  theme?: GameTheme;
}

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function GameCanvas(
  { engineFactory, onStateChange, onGameOver, hideFocusOverlay, theme },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // `theme` se lee solo en el montaje a propósito: si entrase en las dependencias,
    // cada cambio de tema recrearía el motor y reiniciaría la partida.
    const engine = engineFactory(canvas, { theme });
    engineRef.current = engine;
    engine.onStateChange(onStateChange);
    engine.onGameOver(onGameOver);
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineFactory]);

  useEffect(() => {
    if (!theme) return;
    engineRef.current?.setTheme?.(theme);
  }, [theme]);

  useImperativeHandle(ref, () => ({
    pause: () => engineRef.current?.pause(),
    resume: () => engineRef.current?.resume(),
    restart: () => engineRef.current?.restart(),
    forceGameOver: () => engineRef.current?.forceGameOver(),
  }));

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        tabIndex={0}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: "100%", height: "100%", display: "block", outline: "none" }}
      />
      {!focused && !hideFocusOverlay && (
        <div
          className="crt-content"
          role="button"
          tabIndex={-1}
          onClick={() => canvasRef.current?.focus()}
          style={{ background: "rgba(0,0,0,0.6)", cursor: "pointer", zIndex: 5 }}
        >
          <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
            CLIC PARA JUGAR
          </div>
        </div>
      )}
    </div>
  );
});

export default GameCanvas;
