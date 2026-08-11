import type { GameTheme } from "@/lib/games/theme";

export type TetrisCellStyle = "bevel" | "flat" | "outline";

export interface TetrisPalette {
  /** Fondo del canvas completo. */
  background: string;
  /** Líneas de la rejilla del tablero. */
  grid: string;
  /** Marco del recuadro de siguiente pieza. */
  previewFrame: string;
  /** 10 entradas: índice 0 = null (celda vacía), 1..9 = piezas + bomba + gravedad. */
  pieces: (string | null)[];
  cellStyle: TetrisCellStyle;
  /** Multiplicador de shadowBlur sobre el tamaño de celda. 0 = sin glow. */
  glow: number;
  /** Brillo superior del bisel (solo cellStyle "bevel"). */
  bevel: string;
  /** Borde interior (solo cellStyle "outline"). */
  outline: string;
  /** Alpha de la pieza fantasma. */
  ghostAlpha: number;
}

export const TETRIS_THEMES: Record<GameTheme, TetrisPalette> = {
  clasico: {
    background: "#0f1b0f",
    grid: "rgba(155,188,15,0.10)",
    previewFrame: "rgba(155,188,15,0.35)",
    pieces: [
      null,
      "#9bbc0f",
      "#8bac0f",
      "#306230",
      "#0f380f",
      "#9bbc0f",
      "#8bac0f",
      "#306230",
      "#0f380f",
      "#9bbc0f",
    ],
    cellStyle: "flat",
    glow: 0,
    bevel: "rgba(255,255,255,0.15)",
    outline: "rgba(15,56,15,0.8)",
    ghostAlpha: 0.25,
  },
  neon: {
    background: "#000000",
    grid: "rgba(255,255,255,0.08)",
    previewFrame: "rgba(255,255,255,0.2)",
    pieces: [
      null,
      "#00e5ff",
      "#fff176",
      "#e040fb",
      "#69f0ae",
      "#ff1744",
      "#40c4ff",
      "#ffab40",
      "#ff5252",
      "#d500f9",
    ],
    cellStyle: "bevel",
    glow: 0.5,
    bevel: "rgba(255,255,255,0.35)",
    outline: "rgba(0,0,0,0.4)",
    ghostAlpha: 0.2,
  },
  pixel: {
    background: "#101828",
    grid: "rgba(255,255,255,0.06)",
    previewFrame: "rgba(255,255,255,0.25)",
    pieces: [
      null,
      "#3cbcfc",
      "#fcd8a8",
      "#b53120",
      "#00a800",
      "#d82800",
      "#0058f8",
      "#fc9838",
      "#f83800",
      "#7c20a0",
    ],
    cellStyle: "outline",
    glow: 0,
    bevel: "rgba(255,255,255,0.2)",
    outline: "rgba(0,0,0,0.55)",
    ghostAlpha: 0.3,
  },
};
