# 09 — Motor de Arkanoid real ("ARKANOID")

**Estado:** Aprobado
**Depende de:** [[05-motor-de-juegos-y-asteroides]], [[06-leaderboard-supabase]]
**Fecha:** 2026-08-09

**Objetivo:** Renombrar el juego "BLOQUE BUSTER" (`id: "bloque-buster"`) del catálogo a "ARKANOID" (`id: "arkanoid"`) y reemplazar su reproductor simulado por una implementación real de Arkanoid/Breakout (portada desde `references/started-games/04-arkanoid/`) usando el `<canvas>` 800×600 y el contrato `GameEngine` ya existentes, sin modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx` ni el leaderboard genérico de Supabase.

## Alcance

**Incluido:**
- Renombrar la entrada existente del catálogo en `lib/data.ts`: `id: "bloque-buster"` → `id: "arkanoid"`, `title: "BLOQUE BUSTER"` → `title: "ARKANOID"`, `cover: "cover-bricks"` → `cover: "cover-arkanoid"` (categoría `ARCADE` y color `cyan` se mantienen sin cambio); `short`/`long` se ajustan levemente a la identidad "Arkanoid" sin cambiar la mecánica que ya describen (paleta + pelota + muros de bloques). Renombrar en consecuencia `.cover-bricks`/`.cover-bricks::after` en `app/globals.css` a `.cover-arkanoid`/`.cover-arkanoid::after`. Actualizar `app/page.tsx:27` (`g: "Bloque Buster"` → `g: "Arkanoid"`, en la fila de "Actividad en vivo").
- `lib/games/arkanoid.ts`: puerto a TypeScript de la lógica de `game.js` (paleta horizontal, pelota con rebote en paredes/paleta/bloques, grid de bloques 7×14 con colores por fila que rotan cada nivel, 3 niveles con velocidad de bola +15% por nivel, sistema de vidas), encapsulado en `createArkanoidEngine(canvas): GameEngine`, como closure sin variables de módulo (mismo patrón que `lib/games/asteroids.ts`/`lib/games/tetris.ts`).
- Movimiento de paleta (`←`/`→`), lanzamiento de bola (`Espacio`, también avanza al siguiente nivel tras limpiar todos los bloques) idénticos al original en física y velocidades.
- Puntuación: 10 puntos por bloque destruido (`BLOCK_SCORE`), igual que el original.
- Grid de bloques: 7 filas × 14 columnas, colores de fila rotados `(nivel - 1) * 2` posiciones (mismo algoritmo que `createBlocks` en `game.js`), regenerado al avanzar de nivel.
- Vidas: 3 al iniciar; se pierde una vida y la bola vuelve a la paleta cada vez que cae fuera del área de juego por abajo; a la 4ª pérdida (`lives === 0`) termina la partida.
- Progresión de niveles: al destruir todos los bloques del nivel actual, sube de nivel (2 y 3), regenera el grid y la bola vuelve a la paleta a la espera de un nuevo lanzamiento; la velocidad de la bola al relanzar es `BASE_SPEED × 1.15^(nivel - 1)`, igual que `launchBall()` en el original.
- Fin de partida por victoria: al limpiar el nivel 3 (`TOTAL_LEVELS`), se dispara `onGameOver(score)` con el score final acumulado — mismo modal de fin de partida que al perder las 3 vidas, sin un estado de "victoria" separado (el contrato `GameEngine` no lo distingue).
- Destrucción de bloques: al ser golpeado, el bloque se elimina de inmediato (sin animación de explosión multi-frame del original, ver Decisiones) y suma el puntaje.
- `lib/games/registry.ts`: se agrega `arkanoid: createArkanoidEngine`.
- Migración de Supabase (`games` table) actualizando la fila existente `('bloque-buster', 'BLOQUE BUSTER')` a `('arkanoid', 'ARKANOID')` — ver Modelo de datos y Plan de implementación.

**Explícitamente fuera de alcance:**
- Cualquier otro juego del catálogo (`tetris`, `serpentina`, `gloton`, `invasores`, `asteroid`, `ranaria`, `duelo-pixel`) — `asteroid` y `tetris` siguen con su motor real ([[05-motor-de-juegos-y-asteroides]], [[08-motor-tetris]]); el resto sigue con el `GamePlayer` simulado, sin cambios de comportamiento visible.
- Sonido (rebote de pelota, rotura de bloque) y el toggle de mute (`M`) — el original los tiene, pero ninguno de los motores ya implementados (Asteroids, Tetris) usa audio; los assets de sonido (`assets/sounds/*.mp3`) tampoco existen en este repo.
- Pausa por teclado (`P`/`Esc`) y reinicio por tecla (`R`) — la pausa/reinicio ya los controla React vía `pause()`/`resume()`/`restart()` del engine, igual que en Asteroids y Tetris; no se duplican por teclado.
- Animación de explosión de bloques en 4 frames de sprite — el original la dibuja con un spritesheet (`assets/spritesheet.js`) que no existe en este repo; el bloque se elimina al instante en su lugar.
- Pantallas propias de inicio/pausa/nivel-completado/game-over/win dibujadas dentro del canvas (`drawStartScreen`, `drawPausedScreen`, `drawLevelCompleteScreen`, `drawEndScreen`) — reemplazadas por el overlay "CLIC PARA JUGAR" y el modal de fin de partida ya existentes en `game-canvas.tsx`/`game-player.tsx`.
- Controles táctiles/móviles o gamepad — solo teclado (flechas, espacio), igual que Asteroid/Tetris.
- Modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx` o el leaderboard genérico (`scores`, `/salon`) — se reutilizan tal cual.

## Modelo de datos

```ts
// lib/games/arkanoid.ts — extiende el contrato existente, no lo reemplaza
// Reutiliza GameEngineState sin campos adicionales: score/lives/level ya cubren
// puntaje, vidas restantes y nivel actual (1-3) del juego.
```

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Record<string, GameEngineFactory> = {
  asteroid: createAsteroidsEngine,
  tetris: createTetrisEngine,
  arkanoid: createArkanoidEngine,
};
```

`lib/games/arkanoid.ts` mantiene internamente (dentro del closure de `createArkanoidEngine`, sin variables de módulo globales) el estado ya presente en el prototipo: paleta (`paddle`), pelota (`ball`, incluida su bandera `launched`), y el arreglo de bloques (`blocks`, con `x`/`y`/`w`/`h`/`color`/`alive`), tipados con TypeScript sin cambiar su comportamiento numérico (velocidades, dimensiones, probabilidad/rotación de colores por nivel, puntaje por bloque).

Migración SQL sobre la fila existente en `games` (actualiza en el lugar, no inserta una nueva — mismo `game_id` lógico que antes referenciaba `bloque-buster`, ahora unificado bajo `arkanoid`; cualquier score histórico con `game_id = 'bloque-buster'` queda huérfano del catálogo visual, ver Riesgos):

```sql
update public.games set id = 'arkanoid', title = 'ARKANOID' where id = 'bloque-buster';
```

## Plan de implementación

1. **Renombrar el catálogo**: en `lib/data.ts`, cambiar `id: "bloque-buster"` → `"arkanoid"`, `title: "BLOQUE BUSTER"` → `"ARKANOID"`, `cover: "cover-bricks"` → `"cover-arkanoid"` (mantener `cat: "ARCADE"`, `color: "cyan"`); ajustar `short`/`long` a la identidad "Arkanoid" sin alterar la mecánica descrita. En `app/globals.css`, renombrar `.cover-bricks*` a `.cover-arkanoid*`. En `app/page.tsx:27`, cambiar `"Bloque Buster"` a `"Arkanoid"`. Verificar que `/juegos/arkanoid` y `/jugar/arkanoid` (antes `/bloque-buster`) resuelven correctamente.
2. **`lib/games/arkanoid.ts`**: portar `game.js` (sin sonido, sin pantallas propias de estado, sin pausa/restart/mute por teclado, sin animación de explosión multi-frame — todos fuera de alcance) a `createArkanoidEngine(canvas): GameEngine` como closure sin estado de módulo. Dibujar paleta/pelota/bloques con formas vectoriales de canvas coherentes con el estilo neon del sitio (no hay spritesheet fuente en este repo). Cada cambio de `score`/`lives`/`level` dispara `onStateChange`. Al llegar a `lives === 0` (bola perdida por 4ª vez) o al limpiar el nivel 3, se fija el estado final y se dispara `onGameOver(score)`. `forceGameOver()` replica el mismo efecto invocado externamente (mismo patrón que `lib/games/asteroids.ts`/`lib/games/tetris.ts`).
3. **`lib/games/registry.ts`**: agregar `arkanoid: createArkanoidEngine`.
4. Ningún cambio en `components/games/game-canvas.tsx` ni `components/game-player.tsx` — la resolución por `GAME_ENGINES[game.id]` ya existente cubre este motor sin modificaciones.
5. **Migración Supabase**: aplicar `update public.games set id = 'arkanoid', title = 'ARKANOID' where id = 'bloque-buster';` contra el proyecto vía `mcp__supabase__apply_migration`. Confirmar con `mcp__supabase__list_tables`/consulta que la fila quedó como `('arkanoid', 'ARKANOID')` y ya no existe `'bloque-buster'`.
6. Verificar manualmente en `npm run dev`: `/jugar/arkanoid` corre Arkanoid real (mover paleta, lanzar/rebotar la bola en paredes/paleta/bloques, destruir bloques y sumar puntaje, perder las 3 vidas y ver el modal de fin, limpiar los 3 niveles y ver el mismo modal de fin con victoria, reiniciar, pausar/reanudar vía botones), y `/jugar/tetris` (u otro juego ya implementado) sigue funcionando sin cambios.
7. `npm run build` sin errores de TypeScript.

Cada paso deja el proyecto compilando; el juego "ARKANOID" solo queda jugable de verdad al completar el paso 3.

## Criterios de aceptación

- [ ] En `lib/data.ts`, el juego tiene `id: "arkanoid"`, `title: "ARKANOID"` y `cover: "cover-arkanoid"` (ya no `"bloque-buster"`/`"BLOQUE BUSTER"`/`"cover-bricks"`); las clases `.cover-arkanoid*` existen en `app/globals.css` y la fila de actividad en vivo en `app/page.tsx` muestra `"Arkanoid"`.
- [ ] `lib/games/arkanoid.ts` exporta `createArkanoidEngine` sin variables de estado a nivel de módulo.
- [ ] `lib/games/registry.ts` mapea `"arkanoid"` a `createArkanoidEngine`.
- [ ] En `/jugar/arkanoid`, mover la paleta (`←`/`→`) y lanzar la bola (`Espacio`) funcionan igual que en el prototipo original.
- [ ] La pelota rebota correctamente en paredes laterales, techo, paleta y bloques, invirtiendo la componente de velocidad correspondiente.
- [ ] Cada bloque destruido suma 10 puntos y desaparece del tablero.
- [ ] El grid de bloques (7×14) se regenera al avanzar de nivel con los colores de fila rotados, igual que `createBlocks` del original.
- [ ] Perder la bola resta una vida y la relanza desde la paleta; al llegar a 0 vidas se dispara `onGameOver` con el score real y se abre el modal de fin de partida.
- [ ] Limpiar todos los bloques de un nivel sube de nivel (hasta 3) y aumenta la velocidad de la bola en 15% respecto al nivel anterior; limpiar el nivel 3 dispara `onGameOver` con el score real (victoria).
- [ ] El HUD de React (`player-hud`) refleja score, vidas y nivel reales del engine, actualizándose en vivo.
- [ ] El botón PAUSA congela el juego (paleta/pelota/bloques quedan quietos) y REANUDAR lo retoma sin saltos.
- [ ] El botón FIN llama a `forceGameOver()`, deteniendo el motor y disparando `onGameOver` con el score acumulado, abriendo el modal de fin de partida.
- [ ] "GUARDAR PUNTUACIÓN" en el modal llama a `saveScore({ game: "arkanoid", score, name })` y aparece una fila real en Supabase `scores` con `game_id: "arkanoid"`.
- [ ] "JUGAR DE NUEVO" reinicia completamente la partida (score 0, 3 vidas, nivel 1, grid de bloques completo).
- [ ] En Supabase, la tabla `games` contiene la fila `('arkanoid', 'ARKANOID')` y ya no contiene `('bloque-buster', 'BLOQUE BUSTER')`.
- [ ] Los demás juegos del catálogo sin motor propio (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando el reproductor simulado sin cambios; `asteroid` y `tetris` siguen con su motor real sin cambios.
- [ ] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Reemplazar `bloque-buster`/`BLOQUE BUSTER` por `arkanoid`/`ARKANOID` en vez de mantener el id existente**: decisión explícita del usuario — sigue el mismo patrón que `rocas`→`asteroid` y `caida`→`tetris` (nombre del juego fuente en inglés), aunque `bloque-buster` ya describía correctamente esta mecánica y no era estrictamente necesario renombrarlo.
- **Reemplazar la entrada `bloque-buster` en vez de crear una entrada nueva**: su `short`/`long` ya narran la mecánica exacta de Arkanoid ("Rebota la pelota y destruye muros de neón", "Pilota una nave-paleta y rebota un núcleo de plasma... Cada nivel reorganiza la grilla") — misma detección automática que `caida`→`tetris`; confirmado con el usuario en Fase 2.
- **`cat: "ARCADE"` y `color: "cyan"` se mantienen sin cambio**: es un renombrado de la misma entrada, no una entrada nueva — no hay motivo para alterar su categoría o color ya asignados.
- **Victoria (limpiar el nivel 3) se mapea a `onGameOver(score)`, igual que perder**: decisión explícita del usuario — el contrato `GameEngine` no distingue "ganar" de "perder", y el modal de fin de partida ya existente (con guardado de puntuación) cubre ambos casos sin necesidad de un tercer estado.
- **No se porta el sonido, la pausa/reinicio por teclado ni el mute**: decisión explícita del usuario — mismo criterio que ya se aplicó en [[08-motor-tetris]] (pausa/reinicio ya los controla React) y ninguno de los assets de sonido existe en este repo.
- **No se porta la animación de explosión de bloques en 4 frames**: decisión explícita del usuario — el original depende de un spritesheet (`assets/spritesheet.js`) que no existe en este repo; el bloque se elimina al instante en su lugar, sin agregar una animación de canvas de reemplazo.
- **No se portan las pantallas propias de inicio/pausa/nivel-completado/game-over/win dibujadas en el canvas**: son responsabilidad del overlay "CLIC PARA JUGAR" y el modal de fin de partida ya existentes en `game-canvas.tsx`/`game-player.tsx`, igual que en Asteroids y Tetris.

## Riesgos identificados

- Si existieran puntuaciones reales ya guardadas en Supabase con `game_id = 'bloque-buster'` antes de este spec, el `update` de la fila en `games` las deja apuntando a un `game_id` (`'bloque-buster'`) que ya no coincide con ningún `id` de `lib/data.ts` — quedarían huérfanas del catálogo visual. Verificar antes de migrar si hay scores existentes con `game_id = 'bloque-buster'`; si los hay, decidir si se migran también (`update scores set game_id = 'arkanoid' where game_id = 'bloque-buster'`) como parte del mismo paso de migración.
- El puerto de `game.js` a un closure de TypeScript debe preservar el orden exacto de las comprobaciones (colisión con bloque antes de invertir `dy`, chequeo de paleta antes de chequeo de "bola perdida", regeneración del grid antes de relanzar la bola) — un reordenamiento accidental podría alterar el balance o el puntaje otorgado, mismo riesgo que documentaron [[05-motor-de-juegos-y-asteroides]] y [[08-motor-tetris]].
