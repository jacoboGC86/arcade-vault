import type { GameTheme } from "./theme";

export interface GameEngineState {
  score: number;
  lives: number;
  level: number;
}

export interface GameEngineOptions {
  theme?: GameTheme;
}

export interface GameEngine {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  forceGameOver: () => void;
  onStateChange: (cb: (state: GameEngineState) => void) => void;
  onGameOver: (cb: (finalScore: number) => void) => void;
  /** Solo lo implementan los motores con temas (hoy: Tetris). */
  setTheme?: (theme: GameTheme) => void;
}

export type GameEngineFactory = (
  canvas: HTMLCanvasElement,
  opts?: GameEngineOptions
) => GameEngine;
