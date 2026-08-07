import type { GameEngineFactory } from "./engine";
import { createAsteroidsEngine } from "./asteroids";

export const GAME_ENGINES: Record<string, GameEngineFactory> = {
  asteroid: createAsteroidsEngine,
};
