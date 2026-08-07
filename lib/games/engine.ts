export interface GameEngineState {
  score: number;
  lives: number;
  level: number;
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
}

export type GameEngineFactory = (canvas: HTMLCanvasElement) => GameEngine;
