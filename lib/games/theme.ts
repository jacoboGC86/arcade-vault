"use client";

import { useEffect, useState } from "react";

export const GAME_THEMES = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "neon", label: "NEON" },
  { id: "pixel", label: "PIXEL" },
] as const;

export type GameTheme = (typeof GAME_THEMES)[number]["id"];

export const DEFAULT_GAME_THEME: GameTheme = "clasico";
export const GAME_THEME_STORAGE_KEY = "av_theme";

function isGameTheme(value: unknown): value is GameTheme {
  return GAME_THEMES.some((t) => t.id === value);
}

export function useGameTheme(): [GameTheme, (t: GameTheme) => void] {
  const [theme, setTheme] = useState<GameTheme>(DEFAULT_GAME_THEME);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GAME_THEME_STORAGE_KEY);
      if (isGameTheme(stored)) setTheme(stored);
    } catch {
      // localStorage no disponible: se queda con el tema por defecto
    }
  }, []);

  const selectTheme = (t: GameTheme) => {
    setTheme(t);
    try {
      localStorage.setItem(GAME_THEME_STORAGE_KEY, t);
    } catch {
      // ignorar: el tema sigue aplicado en memoria
    }
  };

  return [theme, selectTheme];
}
