import type { GameTheme } from "@/lib/games/theme";

/**
 * Cómo se pintan las siluetas vectoriales (nave, asteroides, ítems de power-up):
 * - "stroke": solo contorno, como el arcade original.
 * - "fill": silueta plana rellena, sin contorno.
 * - "fill-outline": silueta rellena con borde duro (`shapeOutline`).
 */
export type AsteroidShapeStyle = "stroke" | "fill" | "fill-outline";

export interface AsteroidPalette {
  /** Fondo del canvas completo. */
  background: string;
  /** Casco de la nave. */
  ship: string;
  /** Llama del propulsor (trazo abierto, siempre stroke). */
  thruster: string;
  /** Contorno/relleno de los asteroides. */
  asteroid: string;
  /** Balas del jugador. */
  bullet: string;
  /** Color base de las partículas de explosión; el alpha lo calcula el motor por vida. */
  particle: string;
  /** Color base del aura circular del escudo; el alpha lo calcula el motor. */
  shield: string;
  /** Hexágono del ítem de escudo en el suelo. */
  shieldPowerUp: string;
  /** Color base del aura rómbica del disparo triple; el alpha lo calcula el motor. */
  tripleShotAura: string;
  /** Diamante del ítem de disparo triple en el suelo. */
  triplePowerUp: string;
  /** Estilo de pintado de las siluetas vectoriales. */
  shapeStyle: AsteroidShapeStyle;
  /** Borde duro de las siluetas (solo shapeStyle "fill-outline"). */
  shapeOutline: string;
  /** Multiplicador de shadowBlur sobre las siluetas. 0 = sin glow. */
  glow: number;
}

export const ASTEROID_THEMES: Record<GameTheme, AsteroidPalette> = {
  clasico: {
    background: "#0f1b0f",
    ship: "#9bbc0f",
    thruster: "#8bac0f",
    asteroid: "#8bac0f",
    bullet: "#9bbc0f",
    particle: "#8bac0f",
    shield: "#9bbc0f",
    shieldPowerUp: "#9bbc0f",
    tripleShotAura: "#8bac0f",
    triplePowerUp: "#8bac0f",
    shapeStyle: "fill",
    shapeOutline: "#0f380f",
    glow: 0,
  },
  neon: {
    background: "#000000",
    ship: "#ffffff",
    thruster: "rgba(255, 130, 0, 0.85)",
    asteroid: "#ffffff",
    bullet: "#ffffff",
    particle: "#ffffff",
    shield: "#00dcff",
    shieldPowerUp: "#ffffff",
    tripleShotAura: "#ff0000",
    triplePowerUp: "#ff0000",
    shapeStyle: "stroke",
    shapeOutline: "rgba(0,0,0,0.4)",
    glow: 0,
  },
  pixel: {
    background: "#101828",
    ship: "#3cbcfc",
    thruster: "#fc9838",
    asteroid: "#fcd8a8",
    bullet: "#fcfcfc",
    particle: "#fcd8a8",
    shield: "#58d854",
    shieldPowerUp: "#58d854",
    tripleShotAura: "#d82800",
    triplePowerUp: "#d82800",
    shapeStyle: "fill-outline",
    shapeOutline: "rgba(0,0,0,0.55)",
    glow: 0,
  },
};
