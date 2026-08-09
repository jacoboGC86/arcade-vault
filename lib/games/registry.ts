import type { GameEngineFactory } from "./engine";
import { createAsteroidsEngine } from "./asteroids";
import { createTetrisEngine } from "./tetris";
import { createArkanoidEngine } from "./arkanoid";

export const GAME_ENGINES: Record<string, GameEngineFactory> = {
  asteroid: createAsteroidsEngine,
  tetris: createTetrisEngine,
  arkanoid: createArkanoidEngine,
};
