# 10 — Temas visuales aplicados a Tetris

**Estado:** Implementado
**Depende de:** [[05-motor-de-juegos-y-asteroides]], [[08-motor-tetris]]
**Fecha:** 2026-08-11

**Objetivo:** Hacer que el selector de tema del HUD (CLÁSICO / NEON / PIXEL, ya existente en `lib/games/theme.ts` y `components/game-player.tsx`) repinte de verdad el canvas de Tetris —paleta de piezas, fondo, rejilla, glow y estilo de celda— aplicándose en caliente sin reiniciar la partida, mediante una extensión opcional del contrato `GameEngine` que no rompe a Asteroids ni Arkanoid.

## Alcance

**Incluido:**

- Extensión del contrato en `lib/games/engine.ts`:
  - `GameEngineFactory` pasa de `(canvas: HTMLCanvasElement) => GameEngine` a `(canvas: HTMLCanvasElement, opts?: GameEngineOptions) => GameEngine`, con `GameEngineOptions = { theme?: GameTheme }`. Al ser opcional, `createAsteroidsEngine` y `createArkanoidEngine` siguen siendo asignables a `GameEngineFactory` sin tocarlos.
  - `GameEngine` gana `setTheme?: (theme: GameTheme) => void`, **opcional**, para que solo Tetris lo implemente.
- Archivo nuevo `lib/games/themes/tetris-theme.ts` con el tipo `TetrisPalette` y el mapa `TETRIS_THEMES: Record<GameTheme, TetrisPalette>` para los tres temas. Es el único sitio con colores de Tetris.
- `lib/games/tetris.ts`:
  - `createTetrisEngine(canvas, opts?)` inicializa `palette = TETRIS_THEMES[opts?.theme ?? DEFAULT_GAME_THEME]`.
  - Implementa `setTheme(theme)`: reasigna `palette` dentro del closure. No toca `board`, `current`, `next`, `score`, `lines`, `level` ni el estado de pausa. El siguiente `draw()` ya usa la paleta nueva; si el juego está pausado (sin `requestAnimationFrame` activo) se fuerza un `draw(performance.now())` para que el repintado sea inmediato.
  - Se elimina la constante de módulo `COLORS` y las literales `"#000"`, `"rgba(255,255,255,0.08)"` (rejilla), `"rgba(255,255,255,0.2)"` (marco del preview) y `"rgba(255,255,255,0.35)"` (bisel): todas pasan por `palette`.
  - `drawCell` bifurca por `palette.cellStyle` (`"bevel" | "flat" | "outline"`) y usa `palette.glow` como multiplicador de `shadowBlur` (`size * palette.glow`; `0` desactiva el glow).
  - El ghost sigue dibujándose con la misma celda a `alpha = palette.ghostAlpha` (hoy fijo en `0.2`), configurable por tema para que siga siendo legible sobre fondos claros como el de CLÁSICO.
- `components/games/game-canvas.tsx`: nueva prop `theme?: GameTheme`. Se pasa al factory en el `useEffect` de montaje (que **no** añade `theme` a su array de dependencias, para no remontar el motor) y un `useEffect` separado con dependencia `[theme]` llama a `engineRef.current?.setTheme?.(theme)`.
- `components/game-player.tsx`: pasar `theme={theme}` al `<GameCanvas>`. El `theme` ya viene de `useGameTheme()`; no cambia nada más del componente.
- Los tres temas de Tetris, con identidad propia:
  - **CLÁSICO** — Game Boy: fondo oliva oscuro, 4 verdes monocromos reutilizados cíclicamente para las 9 entradas de pieza, `glow: 0`, `cellStyle: "flat"`, rejilla verde muy tenue.
  - **NEON** — el look actual: fondo negro, la paleta saturada de hoy (`#00e5ff`, `#fff176`, `#e040fb`, `#69f0ae`, `#ff1744`, `#40c4ff`, `#ffab40`, `#ff5252`, `#d500f9`), `glow: 0.5`, `cellStyle: "bevel"`. Es el tema que reproduce píxel a píxel el render actual.
  - **PIXEL** — NES: fondo azul noche, 9 colores planos de gama NES, `glow: 0`, `cellStyle: "outline"` (relleno sólido + borde interior de 2 px en `outline`).

**Explícitamente fuera de alcance:**

- Aplicar temas a `lib/games/asteroids.ts` y `lib/games/arkanoid.ts`. Ignoran `opts.theme` y no implementan `setTheme`; su render no cambia en ningún tema. Cada uno tendrá su propio spec.
- El reproductor simulado (juegos sin motor registrado): los chips siguen visibles y persistiendo la elección, pero la arena CSS de placeholder no cambia de aspecto.
- Cambiar el HUD, el marco CRT, el scanline, los botones o el modal de fin de partida por tema. `data-theme` en `.av-player` se mantiene y sigue estilizando únicamente los chips.
- Añadir, quitar o renombrar temas: siguen siendo exactamente los tres de `GAME_THEMES`.
- Cambiar la clave o el mecanismo de persistencia (`localStorage["av_theme"]`, `useGameTheme`), o migrarlo a Supabase / al perfil de usuario.
- Cualquier cambio de mecánica, puntuación, velocidad o `TetrisEngineState`. Este spec es puramente de render.
- Tema por juego (un tema distinto en Tetris y en Asteroids): la selección sigue siendo global y única.

## Modelo de datos

```ts
// lib/games/engine.ts — extensión retrocompatible
import type { GameTheme } from "./theme";

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
```

```ts
// lib/games/themes/tetris-theme.ts — nuevo
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
    pieces: [null, "#9bbc0f", "#8bac0f", "#306230", "#0f380f", "#9bbc0f", "#8bac0f", "#306230", "#0f380f", "#9bbc0f"],
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
    pieces: [null, "#00e5ff", "#fff176", "#e040fb", "#69f0ae", "#ff1744", "#40c4ff", "#ffab40", "#ff5252", "#d500f9"],
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
    pieces: [null, "#3cbcfc", "#fcd8a8", "#b53120", "#00a800", "#d82800", "#0058f8", "#fc9838", "#f83800", "#7c20a0"],
    cellStyle: "outline",
    glow: 0,
    bevel: "rgba(255,255,255,0.2)",
    outline: "rgba(0,0,0,0.55)",
    ghostAlpha: 0.3,
  },
};
```

Notas del modelo:

- `pieces` conserva el índice 0 = `null` para que `drawCell` mantenga su guarda `if (!colorIndex) return;` y los índices 1..9 sigan mapeando exactamente a los mismos tetrominós/power-ups que hoy (I, O, T, S, Z, J, L, bomba, gravedad).
- Ninguna estructura persistida cambia. El único dato guardado sigue siendo el string del tema en `localStorage["av_theme"]`, que ya escribe `useGameTheme`.
- No hay cambios en Supabase: ni en `games`, ni en `scores`.

## Plan de implementación

Cada paso deja el proyecto compilando y jugable.

1. **Extender el contrato.** En `lib/games/engine.ts`, añadir `GameEngineOptions`, el segundo parámetro opcional de `GameEngineFactory` y `setTheme?` en `GameEngine`. Verificar que `lib/games/registry.ts` sigue tipando sin cambios (Asteroids/Arkanoid/Tetris siguen siendo factories válidas). Nada cambia visualmente todavía.
2. **Crear las paletas.** Añadir `lib/games/themes/tetris-theme.ts` con `TetrisPalette`, `TetrisCellStyle` y `TETRIS_THEMES` tal como en el modelo de datos. Todavía no lo consume nadie.
3. **Parametrizar el render de Tetris.** En `lib/games/tetris.ts`: aceptar `opts`, guardar `palette` en el closure, borrar la constante `COLORS` y sustituir todas las literales de color de `drawCell`, `drawGrid`, `drawNextPreview` y `draw` por campos de `palette`. Implementar `cellStyle` (`bevel` = comportamiento actual, `flat` = relleno sólido sin brillo, `outline` = relleno + borde interior de 2 px) y `glow`. Sin pasar `theme` desde React, el motor arranca en `DEFAULT_GAME_THEME` (`clasico`), lo cual es un cambio visible esperado que el paso 4 conecta al selector.
4. **Propagar el tema desde React.** En `components/games/game-canvas.tsx` añadir la prop `theme`, pasarla al factory en el montaje (sin meterla en las dependencias de ese `useEffect`) y añadir un `useEffect` con dependencia `[theme]` que invoque `engineRef.current?.setTheme?.(theme)`. En `components/game-player.tsx`, pasar `theme={theme}` al `<GameCanvas>`.
5. **Añadir `setTheme` a Tetris.** Exponer `setTheme` en el objeto devuelto por `createTetrisEngine`: reasigna `palette` y, si el bucle no está corriendo (partida pausada), fuerza un `draw()` para repintar al instante.
6. **Verificación manual.** `npm run dev`, ir a `/jugar/tetris`, jugar unas piezas y alternar los tres chips: comprobar que el canvas cambia al instante y que puntuación, tablero, pieza actual y preview no se reinician; recargar la página y comprobar que el tema elegido persiste; abrir `/jugar/asteroid` y `/jugar/arkanoid` y comprobar que los chips no alteran su render.

## Criterios de aceptación

- [ ] `lib/games/engine.ts` declara `GameEngineOptions`, `GameEngineFactory` con segundo parámetro opcional y `setTheme?` en `GameEngine`.
- [ ] Existe `lib/games/themes/tetris-theme.ts` exportando `TetrisPalette` y `TETRIS_THEMES` con las tres claves `clasico`, `neon`, `pixel`.
- [ ] `lib/games/tetris.ts` no contiene ninguna literal de color hardcodeada: ni `COLORS`, ni `"#000"`, ni `rgba(255,255,255,...)`.
- [ ] Con el tema NEON, el canvas de Tetris se ve idéntico al render previo a este spec (mismos 9 colores, mismo glow, mismo bisel, fondo negro).
- [ ] Con CLÁSICO y con PIXEL el fondo, la rejilla, los colores de pieza y el estilo de celda son visiblemente distintos entre sí y respecto a NEON.
- [ ] Pulsar un chip de tema durante una partida en curso cambia el aspecto en el siguiente frame **sin** que `score`, `lines`, `level`, el tablero, la pieza actual ni la siguiente pieza se reinicien.
- [ ] Pulsar un chip de tema con la partida en pausa repinta el canvas de inmediato, sin reanudar el juego.
- [ ] Al recargar `/jugar/tetris`, el motor arranca con el tema guardado en `localStorage["av_theme"]`.
- [ ] `/jugar/asteroid` y `/jugar/arkanoid` renderizan exactamente igual en los tres temas.
- [ ] `npx tsc --noEmit` y `npm run build` pasan sin errores.
- [ ] Ni `app/globals.css`, ni el HUD, ni el marco CRT, ni el modal de fin de partida cambian respecto a `main`.

## Decisiones tomadas y descartadas

- **`setTheme` opcional en `GameEngine` en vez de `key={theme}` en `<GameCanvas>`.** El remount por `key` no requeriría tocar el contrato, pero destruiría el motor y reiniciaría la partida en cada cambio de tema — inaceptable para un control que está en el HUD durante el juego. Se descartó también leer los colores del DOM con `getComputedStyle` sobre variables CSS de `data-theme`: acopla el motor al DOM, obliga a parsear strings y complica los tests futuros.
- **`opts` como objeto y no como segundo parámetro suelto `theme`.** Deja sitio para futuras opciones por motor (dificultad, semilla) sin volver a romper la firma.
- **Paletas en `lib/games/themes/tetris-theme.ts`, no en `lib/games/theme.ts`.** Los 9 colores de pieza son específicos de Tetris; meterlos en el módulo compartido obligaría a inventar un token genérico artificial. `lib/games/theme.ts` se queda como selector + persistencia, y cada motor que adopte temas añadirá su propio archivo bajo `lib/games/themes/`.
- **NEON reproduce exactamente el render actual.** Sirve de línea base para verificar que la refactorización no introdujo regresiones de color, y evita que un usuario habituado pierda el aspecto que ya conocía.
- **`cellStyle` como enum de tres valores en vez de flags booleanos sueltos.** Un `"bevel" | "flat" | "outline"` mantiene `drawCell` con un único `switch` legible, en lugar de combinaciones de flags que nunca se van a usar.
- **CLÁSICO reutiliza 4 verdes para 9 índices de pieza.** La paleta Game Boy real solo tiene 4 tonos; distinguir 9 piezas es imposible por color, igual que en el original. Se acepta la ambigüedad como parte de la identidad del tema, y el `cellStyle: "flat"` con la rejilla visible mantiene los bordes de bloque legibles.
- **Descartado tematizar el chasis (HUD/CRT/modal) en este spec.** Habría multiplicado el CSS a mantener en `app/globals.css` y mezclado dos alcances. `data-theme` ya está en el wrapper, así que hacerlo después no requiere ningún cambio estructural.
- **Descartado extender el tema a Asteroids y Arkanoid ahora.** Cada motor tiene su propio vocabulario visual (nave/partículas, paleta/bloques); son specs independientes. El contrato queda preparado para ambos.

## Riesgos identificados

- **Legibilidad del ghost en CLÁSICO.** Sobre un fondo oliva claro, un ghost al 0.2 de alpha puede desaparecer. Mitigado con `ghostAlpha` por tema (0.25 en CLÁSICO, 0.3 en PIXEL); verificar a ojo en el paso 6 y ajustar el valor si hace falta.
- **Cierre sobre `palette` en el closure.** Si algún helper de dibujo capturase la paleta en una variable local en vez de leerla del closure en cada llamada, `setTheme` no tendría efecto hasta reiniciar. Todos los accesos deben ser `palette.x` en el momento del `draw`.
- **Remount accidental del motor.** Si `theme` entra en el array de dependencias del `useEffect` de montaje de `game-canvas.tsx`, cada cambio de tema recrearía el motor y reiniciaría la partida — exactamente lo que este spec quiere evitar. Es el punto que más atención requiere en la revisión del paso 4.
- **Repintado en pausa.** `pause()` cancela el `requestAnimationFrame`, así que sin el `draw()` forzado de `setTheme` el cambio de tema no se vería hasta reanudar.
