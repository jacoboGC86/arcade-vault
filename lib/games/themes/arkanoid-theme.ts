import type { GameTheme } from "@/lib/games/theme";

/**
 * Estilo de trazo de los bloques.
 * - "glow": relleno plano apoyado en el shadowBlur (aspecto neón).
 * - "flat": relleno plano sin borde ni brillo (silueta Game Boy).
 * - "outline": relleno plano con borde duro (píxel NES).
 */
export type ArkanoidBlockStyle = "glow" | "flat" | "outline";

export interface ArkanoidPalette {
  /** Fondo del canvas completo. */
  background: string;
  /** Relleno y color de brillo de la pala. */
  paddle: string;
  /** Relleno y color de brillo de la bola. */
  ball: string;
  /**
   * 7 colores, uno por fila de bloques. El motor los rota por nivel
   * (2 posiciones por nivel), así que el orden importa.
   */
  blockRows: string[];
  /** Estilo de trazo de los bloques. */
  blockStyle: ArkanoidBlockStyle;
  /** Borde de los bloques (solo blockStyle "outline"). */
  blockOutline: string;
  /** Multiplicador de shadowBlur para pala, bola y bloques. 0 = sin glow. */
  glow: number;
}

export const ARKANOID_THEMES: Record<GameTheme, ArkanoidPalette> = {
  clasico: {
    background: "#0f1b0f",
    paddle: "#8bac0f",
    ball: "#9bbc0f",
    blockRows: [
      "#9bbc0f",
      "#8bac0f",
      "#306230",
      "#8bac0f",
      "#9bbc0f",
      "#306230",
      "#8bac0f",
    ],
    blockStyle: "flat",
    blockOutline: "rgba(15,56,15,0.8)",
    glow: 0,
  },
  neon: {
    background: "#000000",
    paddle: "#00e5ff",
    ball: "#ffffff",
    blockRows: [
      "#ff1744",
      "#ffd600",
      "#00e5ff",
      "#e040fb",
      "#ff4da6",
      "#69f0ae",
      "#9e9e9e",
    ],
    blockStyle: "glow",
    blockOutline: "rgba(0,0,0,0.4)",
    glow: 1,
  },
  pixel: {
    background: "#101828",
    paddle: "#3cbcfc",
    ball: "#fcfcfc",
    blockRows: [
      "#d82800",
      "#fc9838",
      "#fcd8a8",
      "#00a800",
      "#3cbcfc",
      "#0058f8",
      "#7c20a0",
    ],
    blockStyle: "outline",
    blockOutline: "rgba(0,0,0,0.55)",
    glow: 0,
  },
};
