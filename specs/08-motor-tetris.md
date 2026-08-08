# 08 — Motor de Tetris real ("TETRIS")

**Estado:** Aprobado
**Depende de:** [[05-motor-de-juegos-y-asteroides]], [[06-leaderboard-supabase]]
**Fecha:** 2026-08-08

**Objetivo:** Renombrar el juego "CAÍDA" (`id: "caida"`) del catálogo a "TETRIS" (`id: "tetris"`) y reemplazar su reproductor simulado por una implementación real de Tetris (portada desde `references/started-games/03-tetris/`) usando el `<canvas>` 800×600 y el contrato `GameEngine` ya existentes, sin modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx` ni el leaderboard genérico de Supabase.

## Alcance

**Incluido:**
- Renombrar la entrada existente del catálogo en `lib/data.ts`: `id: "caida"` → `id: "tetris"`, `title: "CAÍDA"` → `title: "TETRIS"`, `cover: "cover-tetro"` → `cover: "cover-tetris"` (categoría `PUZZLE` y color `magenta` se mantienen sin cambio), y `short`/`long` ajustados a la identidad de Tetris real. Renombrar en consecuencia `.cover-tetro`/`.cover-tetro::after` en `app/globals.css` a `.cover-tetris`/`.cover-tetris::after`. Actualizar el texto `"Caída"` de la fila de "Actividad en vivo" en `app/page.tsx:23` a `"Tetris"`.
- `lib/games/tetris.ts`: puerto a TypeScript de la lógica de `game.js` (tablero 10×20, las 7 piezas estándar I/O/T/S/Z/J/L, rotación con wall kicks, soft drop, hard drop, limpieza de líneas, niveles, y las dos piezas especiales — bomba y power-up de gravedad, ver más abajo), encapsulado en `createTetrisEngine(canvas): GameEngine`, como closure sin variables de módulo (mismo patrón que `lib/games/asteroids.ts`).
- Tablero y pieza siguiente se dibujan ambos dentro del único `<canvas>` de 800×600 que ya monta `game-canvas.tsx`: el tablero (10×20 celdas de 30px = 300×600px) ocupa la franja izquierda del canvas (x: 0–300), y la vista previa de la siguiente pieza se dibuja en una caja fija en la esquina superior derecha (p. ej. x: 340–460, y: 20–140) con el mismo estilo de bloque que el tablero. No se agrega ningún elemento DOM ni segundo `<canvas>`.
- Rotación con wall kicks (`tryRotate`/`rotateCW`), soft drop (`ArrowDown`, +1 punto por fila) y hard drop (`Espacio`, +2 puntos por celda recorrida) idénticos al original.
- Sistema de puntuación clásico: `[0, 100, 300, 500, 800]` líneas simultáneas × nivel actual. Nivel sube cada 10 líneas acumuladas; velocidad de caída = `max(100, 1000 - (nivel - 1) * 90)` ms.
- Pieza especial "Bomba" (8% de probabilidad de aparecer en vez de una pieza estándar; al aterrizar, en vez de fijarse en el tablero, vacía un área de 3×3 celdas centrada en su posición) y power-up "Gravedad" (cada 20000ms se encola como próxima pieza; al aterrizar compacta huecos de cada columna en vez de fijarse), portados tal cual desde `game.js` (`SPECIAL_PIECE_CHANCE = 0.08`, `GRAVITY_INTERVAL = 20000`).
- `GameEngineState` se extiende para este motor con `lines` (líneas eliminadas acumuladas) y `bestCombo` (mayor racha de limpiezas consecutivas en la partida) — ver Modelo de datos. `score`/`level` se usan igual que en el resto de motores; `lives` vale `1` mientras la partida está activa y pasa a `0` cuando una pieza nueva no cabe al generarse (condición de game over de Tetris, mapeada a la única "vida" del contrato genérico).
- `lib/games/registry.ts`: se agrega `tetris: createTetrisEngine`.
- Migración de Supabase (`games` table) actualizando la fila existente `('caida', 'CAÍDA')` a `('tetris', 'TETRIS')` — ver Modelo de datos y Plan de implementación.

**Explícitamente fuera de alcance:**
- Cualquier otro juego del catálogo (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `asteroid`, `ranaria`, `duelo-pixel`) — `asteroid` sigue con su motor real ([[05-motor-de-juegos-y-asteroides]]); el resto sigue con el `GamePlayer` simulado, sin cambios de comportamiento visible.
- Los 4 skins visuales del original (`retro`/`neon`/`pastel`/`pixel`) y el toggle de tema claro/oscuro — el sitio ya tiene su propia identidad visual neon consistente; el motor usa un único estilo de bloque fijo.
- El leaderboard local del prototipo (`localStorage` `tetris-records`, panel de "récords" dentro del juego, input de iniciales al lograr top-5) — reemplazado íntegramente por el flujo ya existente del modal de fin de partida + `saveScore` + `/salon` de [[06-leaderboard-supabase]], igual que ya ocurre con Asteroid.
- Selector de nivel inicial (`start-level-select`) — toda partida empieza siempre en nivel 1, igual que el resto del catálogo.
- Pausa por tecla (`P`/`Escape`) y su menú de pausa dentro del canvas — la pausa ya la controla el botón "PAUSA" de React vía `pause()`/`resume()` del engine, igual que en Asteroid; no se duplica por teclado.
- Sonido/música — el prototipo original no tiene audio; no se agrega en este spec.
- Controles táctiles/móviles o gamepad — solo teclado (flechas, `X`, espacio), igual que Asteroid.
- Guardar el progreso de una partida en curso al pausar/cerrar el navegador — cada partida empieza de cero.
- Modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx` o el leaderboard genérico (`scores`, `/salon`) — se reutilizan tal cual.

## Modelo de datos

```ts
// lib/games/tetris.ts — extiende el contrato existente, no lo reemplaza
export interface TetrisEngineState extends GameEngineState {
  lines: number;      // líneas eliminadas acumuladas en la partida
  bestCombo: number;  // mayor racha de limpiezas consecutivas
}
```

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Record<string, GameEngineFactory> = {
  asteroid: createAsteroidsEngine,
  tetris: createTetrisEngine,
};
```

`lib/games/tetris.ts` mantiene internamente (dentro del closure de `createTetrisEngine`, sin variables de módulo globales) el estado ya presente en el prototipo: tablero (`board`), pieza actual/siguiente (`current`/`next`), acumuladores de tiempo de caída y del power-up de gravedad (`dropAccum`/`gravityAccum`), y contadores de combo (`comboCount`/`bestCombo`), tipados con TypeScript sin cambiar su comportamiento numérico (probabilidades, intervalos, puntuaciones, velocidad de caída por nivel).

Migración SQL sobre la fila existente en `games` (actualiza en el lugar, no inserta una nueva — mismo `game_id` lógico que antes referenciaba `caida`, ahora unificado bajo `tetris`; cualquier score histórico con `game_id = 'caida'` queda huérfano del catálogo visual, ver Riesgos):

```sql
update public.games set id = 'tetris', title = 'TETRIS' where id = 'caida';
```

## Plan de implementación

1. **Renombrar el catálogo**: en `lib/data.ts`, cambiar `id: "caida"` → `"tetris"`, `title: "CAÍDA"` → `"TETRIS"`, `cover: "cover-tetro"` → `"cover-tetris"`, y ajustar `short`/`long` a la identidad de Tetris real (piezas, líneas, niveles). En `app/globals.css`, renombrar `.cover-tetro*` a `.cover-tetris*`. En `app/page.tsx:23`, cambiar `"Caída"` a `"Tetris"`. Verificar que `/juegos/tetris` y `/jugar/tetris` (antes `/caida`) resuelven correctamente.
2. **`lib/games/tetris.ts`**: portar `game.js` (sin los skins, el toggle de tema, el selector de nivel inicial, el panel de récords en `localStorage`, ni la pausa por tecla `P`/`Escape` — todos fuera de alcance) a `createTetrisEngine(canvas): GameEngine` como closure sin estado de módulo. Adaptar el renderizado: el tablero se dibuja en la franja izquierda del canvas de 800×600 (x: 0–300) y la vista previa de la siguiente pieza en una caja fija en la esquina superior derecha, ambos con un único estilo de bloque (equivalente al skin `retro`/`neon` original, a elección visual coherente con el resto del sitio). Cada cambio de `score`/`level`/`lines`/`bestCombo` dispara `onStateChange`; al fallar el spawn de una pieza nueva (colisión inmediata, como en `spawn()` del original) se fija `lives = 0` y se dispara `onGameOver(score)`. `forceGameOver()` replica el mismo efecto invocado externamente (mismo patrón que `lib/games/asteroids.ts`).
3. **`lib/games/registry.ts`**: agregar `tetris: createTetrisEngine`.
4. Ningún cambio en `components/games/game-canvas.tsx` ni `components/game-player.tsx` — la resolución por `GAME_ENGINES[game.id]` ya existente cubre este motor sin modificaciones (el HUD extendido `lines`/`bestCombo` se lee del mismo objeto de estado que ya recibe `onStateChange`, sin tipos nuevos en el lado de React más allá de leer campos opcionales).
5. **Migración Supabase**: aplicar `update public.games set id = 'tetris', title = 'TETRIS' where id = 'caida';` contra el proyecto vía `mcp__supabase__apply_migration`. Confirmar con `mcp__supabase__list_tables`/consulta que la fila quedó como `('tetris', 'TETRIS')` y ya no existe `'caida'`.
6. Verificar manualmente en `npm run dev`: `/jugar/tetris` corre Tetris real (mover, rotar con wall kicks, soft/hard drop, limpiar líneas simples y múltiples, ver aparecer la pieza bomba y el power-up de gravedad, perder al llenarse el tablero, ver el modal de fin con el score/líneas reales, reiniciar, pausar/reanudar vía botones), y `/jugar/bloque-buster` (u otro id sin motor) sigue mostrando el mock sin cambios.
7. `npm run build` sin errores de TypeScript.

Cada paso deja el proyecto compilando; el juego "TETRIS" solo queda jugable de verdad al completar el paso 3.

## Criterios de aceptación

- [ ] En `lib/data.ts`, el juego tiene `id: "tetris"`, `title: "TETRIS"` y `cover: "cover-tetris"` (ya no `"caida"`/`"CAÍDA"`/`"cover-tetro"`); las clases `.cover-tetris*` existen en `app/globals.css` y la fila de actividad en vivo en `app/page.tsx` muestra `"Tetris"`.
- [ ] `lib/games/tetris.ts` exporta `createTetrisEngine` sin variables de estado a nivel de módulo.
- [ ] `lib/games/registry.ts` mapea `"tetris"` a `createTetrisEngine`.
- [ ] En `/jugar/tetris`, mover la pieza (flechas), rotarla (`↑`/`X`) con wall kicks, soft drop (`↓`) y hard drop (`Espacio`) funcionan igual que en el prototipo original.
- [ ] Limpiar 1/2/3/4 líneas simultáneas suma `100/300/500/800 × nivel` puntos respectivamente; el nivel sube cada 10 líneas acumuladas y la velocidad de caída aumenta en consecuencia.
- [ ] La pieza bomba aparece con la probabilidad esperada y, al aterrizar, vacía un área 3×3 en vez de fijarse en el tablero.
- [ ] El power-up de gravedad aparece cada ~20 segundos de juego y, al aterrizar, compacta los huecos de cada columna en vez de fijarse.
- [ ] La vista previa de la siguiente pieza se ve dentro del mismo canvas, actualizándose en cada spawn.
- [ ] El HUD de React (`player-hud`) refleja score, nivel, líneas eliminadas y mejor combo reales del engine, actualizándose en vivo.
- [ ] El botón PAUSA congela el juego (tablero/pieza actual quedan quietos) y REANUDAR lo retoma sin saltos.
- [ ] El botón FIN llama a `forceGameOver()`, deteniendo el motor y disparando `onGameOver` con el score acumulado, abriendo el modal de fin de partida.
- [ ] Cuando una pieza nueva no cabe al generarse (tablero lleno), se abre el mismo modal de fin de partida que el botón FIN, con el score real alcanzado.
- [ ] "GUARDAR PUNTUACIÓN" en el modal llama a `saveScore({ game: "tetris", score, name })` y aparece una fila real en Supabase `scores` con `game_id: "tetris"`.
- [ ] "JUGAR DE NUEVO" reinicia completamente la partida (score 0, líneas 0, combo 0, nivel 1, tablero vacío).
- [ ] En Supabase, la tabla `games` contiene la fila `('tetris', 'TETRIS')` y ya no contiene `('caida', 'CAÍDA')`.
- [ ] Los demás juegos del catálogo sin motor propio (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando el reproductor simulado sin cambios; `asteroid` sigue con su motor real sin cambios.
- [ ] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Reemplazar `caida`/`CAÍDA` por `tetris`/`TETRIS` en vez de mantener el id en español**: decisión explícita del usuario — sigue el mismo patrón que `rocas`→`asteroid` en [[05-motor-de-juegos-y-asteroides]] (nombre del juego fuente en inglés), aunque rompe la convención española del resto del catálogo (`bloque-buster`, `serpentina`, etc.).
- **Reemplazar la entrada `caida` en vez de crear una entrada nueva**: su `short`/`long` ya narran la mecánica de Tetris ("Piezas geométricas descienden... Rótalas, encástralas y limpia líneas... la velocidad aumenta cada 10 líneas") — mismo criterio de detección automática que `rocas`→`asteroid`; confirmado con el usuario en Fase 2.
- **Portar la pieza bomba y el power-up de gravedad**: decisión explícita del usuario — aunque no son Tetris clásico, están presentes tal cual en el `game.js` fuente y el usuario pidió incluirlos completos, con su probabilidad/intervalo originales.
- **Vista previa de la siguiente pieza dibujada dentro del único canvas de 800×600, en vez de extender `game-canvas.tsx` con un segundo canvas o eliminarla**: decisión explícita del usuario — preserva la función original sin tocar el contrato genérico (`GameEngine`/`game-canvas.tsx`) reutilizado por todos los motores, incluido el futuro.
- **`lives` vale 1 mientras la partida está activa y 0 al perder, en vez de no usarse o quedar fijo en 0**: decisión explícita del usuario ("solo tienes una vida") — Tetris no tiene múltiples vidas, pero mapear la única condición de derrota (tablero lleno) a `lives: 1 → 0` aprovecha el campo existente de `GameEngineState` con semántica coherente, en vez de dejarlo inerte.
- **`TetrisEngineState` extiende `GameEngineState` con `lines` y `bestCombo`**: decisión explícita del usuario — ambos son datos que el `game.js` original ya calcula y muestra (HUD `LINES`, estadística `bestCombo` en récords); se exponen vía `onStateChange` para que el HUD de React los refleje, en vez de descartarlos o dejarlos solo internos al motor.
- **Se elimina el leaderboard local (`localStorage` `tetris-records`, input de iniciales in-canvas) en vez de portarlo**: el sitio ya tiene un flujo de guardado de puntuaciones real vía Supabase ([[06-leaderboard-supabase]]) idéntico al que usa Asteroid — mantener el sistema local del prototipo duplicaría la función con una fuente de datos falsa, inconsistente con el resto del catálogo.
- **Se elimina la pausa por tecla (`P`/`Escape`) y su menú in-canvas**: el contrato `GameEngine` ya expone `pause()`/`resume()` conectados al botón "PAUSA" de React (mismo patrón que Asteroid, que tampoco tiene pausa por teclado) — duplicarla por tecla arriesgaría desincronizar el estado visual del botón con el del canvas.
- **Se eliminan los 4 skins visuales y el toggle de tema claro/oscuro del original**: el sitio ya tiene una identidad visual neon consistente aplicada a todos los juegos (incluido Asteroid); permitir cambiar el estilo de un solo juego rompería esa consistencia sin que el usuario lo haya pedido.
- **Migración SQL actualiza la fila `caida`→`tetris` en el lugar (`update`), no inserta una fila nueva ni borra la vieja por separado**: mismo criterio que si se tratara de un rename — mantiene un único `game_id` válido a la vez y evita que la tabla `games` acumule ids obsoletos, coherente con que `lib/data.ts` también reemplaza la entrada en el mismo lugar (no agrega una nueva).

## Riesgos identificados

- Si existieran puntuaciones reales ya guardadas en Supabase con `game_id = 'caida'` antes de este spec, el `update` de la fila en `games` las deja apuntando a un `game_id` (`'caida'`) que ya no coincide con ningún `id` de `lib/data.ts` — quedarían huérfanas del catálogo visual (no aparecerían en `/salon` al elegir la pestaña "Tetris", que consulta por `game_id: "tetris"`). Verificar antes de migrar si hay scores existentes con `game_id = 'caida'`; si los hay, decidir si se migran también (`update scores set game_id = 'tetris' where game_id = 'caida'`) como parte del mismo paso de migración.
- El puerto de `game.js` a un closure de TypeScript debe preservar el orden exacto de las comprobaciones (colisión antes de fijar pieza, limpieza de líneas antes de recalcular nivel/velocidad, spawn de bomba/gravedad con la probabilidad/intervalo originales) — un reordenamiento accidental podría alterar el balance o la puntuación otorgada, mismo riesgo que documentó [[05-motor-de-juegos-y-asteroides]] para Asteroids.
- Dibujar tablero (300×600) y vista previa dentro del mismo canvas de 800×600 deja ~500px de ancho sin uso funcional (a diferencia de Asteroids, que aprovecha los 800×600 completos para el área de juego) — puramente estético, sin impacto funcional, pero vale la pena revisar el layout final contra el resto del sitio durante la implementación.
