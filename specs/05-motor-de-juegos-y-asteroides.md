# 05 — Motor de juegos reutilizable y Asteroids ("ASTEROID")

**Estado:** Aprobado
**Depende de:** —
**Fecha:** 2026-08-07

**Objetivo:** Renombrar el juego "ROCAS" (`id: "rocas"`) del catálogo a "ASTEROID" (`id: "asteroid"`) y reemplazar su reproductor simulado por una implementación real de Asteroids (portada desde `references/started-games/02-asteroids/`) usando un `<canvas>`, integrada a través de una interfaz `GameEngine` genérica y reutilizable que `GamePlayer` pueda usar para futuros juegos reales, mientras los otros 7 juegos del catálogo siguen usando el mock actual sin cambios.

## Alcance

**Incluido:**
- Renombrar la entrada existente del catálogo en `lib/data.ts`: `id: "rocas"` → `id: "asteroid"`, `title: "ROCAS"` → `title: "ASTEROID"`, `cover: "cover-rocas"` → `cover: "cover-asteroid"` (y `short`/`long` ajustados a la nueva identidad del juego). Renombrar en consecuencia la clase `.cover-rocas`/`.cover-rocas::after`/`.cover-rocas::before` en `app/globals.css` a `.cover-asteroid`. Actualizar el texto `"Rocas"` de la fila de "Actividad en vivo" en `app/page.tsx` a `"Asteroid"`.
- Interfaz `GameEngine` en `lib/games/engine.ts`: contrato genérico (`start`, `stop`, `pause`, `resume`, `restart`, `forceGameOver`, y callbacks `onStateChange({ score, lives, level })` / `onGameOver(finalScore)`) que cualquier motor de juego real debe implementar para conectarse al HUD de React existente. `forceGameOver()` es el método que la UI invoca para terminar la partida externamente (botón FIN): detiene el loop interno (equivalente a `stop()`) y dispara sincrónicamente el callback registrado con `onGameOver(score)` usando el score acumulado hasta ese momento, sin esperar a que el estado interno del motor llegue naturalmente a `'gameover'`.
- `lib/games/asteroids.ts`: puerto a TypeScript de la lógica de `game.js` + `shield.js` + `triple-shot.js` (naves, asteroides, balas, partículas, power-up de escudo, power-up de disparo triple), encapsulada en una función factory (p. ej. `createAsteroidsEngine(canvas): GameEngine`) que **no** usa variables globales de módulo — todo el estado vive dentro del closure/instancia para soportar montar/desmontar el componente sin fugas de estado entre partidas o entre remounts de React.
- El HUD dibujado dentro del canvas original (`drawHUD()`: score/nivel/vidas en el propio `<canvas>`) se elimina del puerto — el HUD visible es únicamente el `player-hud` de React ya existente, alimentado por `onStateChange`.
- El auto-restart por teclado del original (`update()`: al llegar a `state === 'gameover'`, un `pressed('Space')` llama a `initGame()` directamente dentro del loop) se elimina del puerto — reiniciar la partida solo puede ocurrir vía `restart()`, invocado por el botón "JUGAR DE NUEVO" del modal de React. Al llegar a `'gameover'` (por vidas agotadas o por `forceGameOver()`), el loop se detiene por completo (`stop()` interno) en vez de seguir corriendo a la espera de Space; así una tecla presionada mientras el modal de fin de partida está abierto no puede reiniciar el motor por detrás del modal.
- `components/games/game-canvas.tsx`: componente cliente que monta un `<canvas>` con resolución interna fija 800×600 (los mismos atributos `width`/`height` que el original, para no tocar las coordenadas/física del juego), pero escalado por CSS a `width: 100%; height: 100%` dentro de `.crt-screen` (que ya es `aspect-ratio: 4/3`, la misma proporción, por lo que la escala visual es 1:1 de aspecto sin distorsión). Instancia el `GameEngine` recibido por props, gestiona el ciclo de vida (crear en mount, `stop()` en unmount) y expone los métodos de control (`pause`/`resume`/`restart`) al padre.
- Requisito de foco explícito: el `<canvas>` tiene `tabIndex={0}` y solo captura teclado (`keydown`/`keyup` con `addEventListener` en el propio elemento, no en `window`) mientras tiene el foco. Mientras no tiene foco (al montar, o si el usuario hace click/tab fuera), se muestra un overlay semitransparente "CLIC PARA JUGAR" superpuesto al canvas; desaparece al ganar foco y reaparece si lo pierde durante la partida.
- `components/game-player.tsx` se modifica para resolver un motor real por `game.id` a través de un registro (`lib/games/registry.ts`, p. ej. `{ asteroid: createAsteroidsEngine }`); si el `id` no tiene motor registrado, se mantiene exactamente el comportamiento simulado actual (fallback, sin regresión para los otros 7 juegos).
- Cuando hay un motor real registrado: el HUD (`player-hud`), los botones PAUSA/REANUDAR/FIN/SALIR y el modal de fin de partida (`GUARDAR PUNTUACIÓN` vía `saveScore`) se conectan al `GameEngine` en lugar del `setInterval` simulado:
  - PAUSA/REANUDAR llama a `pause()`/`resume()` del engine, que cancela/retoma el `requestAnimationFrame` (el juego queda congelado en su posición exacta; al reanudar se resetea el `lastTime` interno del loop para evitar un `dt` gigante).
  - FIN llama a `forceGameOver()` del engine, que detiene el loop y dispara `onGameOver(score)` con el score acumulado hasta ese momento (equivalente a quedarse sin vidas), mostrando el modal de fin de partida.
  - JUGAR DE NUEVO llama a `restart()` (equivalente a `initGame()` del original: reinicia nave, asteroides, power-ups, score, vidas y nivel, y vuelve a arrancar el loop).
  - `saveScore({ game: "asteroid", score, name })` se sigue llamando igual que hoy, con el score real final del engine en vez del simulado.
- Se portan también los power-ups de `shield.js` (escudo temporal) y `triple-shot.js` (disparo triple), incluyendo su spawn aleatorio, colisión y efectos visuales, como parte de `lib/games/asteroids.ts`.
- El favicon y el HTML standalone del prototipo (`favicon.svg`, `index.html`) no se portan — la página ya tiene su propio layout/favicon.

**Explícitamente fuera de alcance:**
- Cualquier otro juego del catálogo (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — siguen usando el `GamePlayer` simulado actual sin cambios de comportamiento visible.
- Persistencia de puntuaciones en Supabase — `saveScore` sigue escribiendo en `localStorage` (`av_scores`) como hoy; conectar el motor real a Supabase es un spec aparte que depende de [[04-integracion-supabase]].
- Controles táctiles/móviles o soporte de gamepad — solo teclado (flechas + espacio), igual que el original.
- Sonido/música — el prototipo original no tiene audio; no se agrega en este spec.
- Guardar el progreso de una partida en curso (pausar y cerrar el navegador no debe recuperar el estado) — cada partida empieza de cero.
- Ajustar la resolución interna del juego (800×600) para aprovechar pantallas muy anchas o muy altas — la física y el layout del original se mantienen intactos, solo se escala visualmente.

## Modelo de datos

No hay persistencia nueva ni tablas — el modelo de datos es de tipos TypeScript en memoria:

```ts
// lib/games/engine.ts
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
```

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Record<string, GameEngineFactory> = {
  asteroid: createAsteroidsEngine,
};
```

`lib/games/asteroids.ts` mantiene internamente (dentro del closure de `createAsteroidsEngine`, sin variables de módulo globales) las clases/estructuras ya existentes en el prototipo: `Ship`, `Asteroid`, `Bullet`, `Particle`, `PowerUp` (escudo) y `TriplePowerUp`, tipadas con TypeScript pero sin cambiar su comportamiento numérico (velocidades, radios, puntos, duraciones de power-ups).

## Plan de implementación

1. **Renombrar el catálogo**: en `lib/data.ts`, cambiar `id: "rocas"` → `"asteroid"`, `title: "ROCAS"` → `"ASTEROID"`, `cover: "cover-rocas"` → `"cover-asteroid"`, y ajustar `short`/`long` a la nueva identidad. En `app/globals.css`, renombrar las reglas `.cover-rocas*` a `.cover-asteroid*`. En `app/page.tsx`, cambiar el texto `"Rocas"` de la fila de actividad en vivo a `"Asteroid"`. Verificar que `/juegos/asteroid` y `/jugar/asteroid` (antes `/rocas`) siguen resolviendo correctamente.
2. **`lib/games/engine.ts`**: definir la interfaz `GameEngine`/`GameEngineState`/`GameEngineFactory` descrita arriba.
3. **`lib/games/asteroids.ts`**: portar `game.js` + `shield.js` + `triple-shot.js` a TypeScript dentro de `createAsteroidsEngine(canvas)`. Convertir las funciones sueltas (`update`, `draw`, `initGame`, `nextLevel`, `killShip`, etc.) en funciones internas del closure que operan sobre estado local (no `window`/módulo global). Quitar `drawHUD()` del ciclo de dibujo (el HUD ahora es React). El `requestAnimationFrame` se arranca en `start()` y se cancela en `stop()`/`pause()`; `resume()` lo reinicia reseteando `lastTime`. Cada cambio de `score`/`lives`/`level` dispara el callback registrado con `onStateChange`; llegar a `state === 'gameover'` (por vidas agotadas) cancela el `requestAnimationFrame` y dispara `onGameOver(score)` en vez de mostrar el overlay `GAME OVER` dibujado en canvas (ese overlay se elimina, el modal de React ya lo cubre). Quitar del `update()` portado la rama que escucha `pressed('Space')` en `state === 'gameover'` para llamar `initGame()` — el reinicio pasa a depender exclusivamente de `restart()`. `forceGameOver()` replica el mismo efecto que llegar a `state === 'gameover'` por vidas agotadas (cancela el loop, fija `state = 'gameover'` y dispara `onGameOver(score)`) pero invocado externamente en vez de por la propia lógica de colisión.
4. **`lib/games/registry.ts`**: mapa `{ asteroid: createAsteroidsEngine }`.
5. **`components/games/game-canvas.tsx`**: componente cliente con el `<canvas width={800} height={600} tabIndex={0}>`, CSS para que ocupe `100%` del contenedor `.crt-screen`, listeners de teclado (`keydown`/`keyup` con `preventDefault` solo para `Space`/flechas) atados al propio elemento canvas (no a `window`), estado de foco (`onFocus`/`onBlur`) para mostrar/ocultar el overlay "CLIC PARA JUGAR", y props para recibir la `GameEngineFactory`, `onStateChange` y `onGameOver` que expone hacia `GamePlayer`. Instancia el engine en un `useEffect` de mount y llama `stop()` en el cleanup.
6. **`components/game-player.tsx`**: buscar `GAME_ENGINES[game.id]`. Si existe, renderizar `GameCanvas` en vez del `.game-arena` simulado, eliminar el `setInterval` de puntuación falsa para ese caso, y conectar `score`/`lives`/`level` del HUD al `onStateChange` del engine. Los botones PAUSA/REANUDAR/FIN se conectan a `pause`/`resume`/`forceGameOver` del engine cuando hay uno activo; si no hay motor registrado para el `id`, todo el comportamiento actual (mock) queda intacto.
7. Verificar manualmente en `npm run dev`: `/jugar/asteroid` corre Asteroids real (mover, disparar, romper asteroides, recoger power-ups, perder las 3 vidas, ver el modal de fin con el score real, reiniciar, pausar/reanudar), y `/jugar/bloque-buster` (u otro id sin motor) sigue mostrando el mock sin cambios.
8. `npm run build` sin errores de TypeScript.

Cada paso deja el proyecto compilando; el juego "ASTEROID" solo queda jugable de verdad al completar el paso 6.

## Criterios de aceptación

- [ ] En `lib/data.ts`, el juego tiene `id: "asteroid"`, `title: "ASTEROID"` y `cover: "cover-asteroid"` (ya no `"rocas"`/`"ROCAS"`/`"cover-rocas"`); las clases `.cover-asteroid*` existen en `app/globals.css` y la fila de actividad en vivo en `app/page.tsx` muestra `"Asteroid"`.
- [ ] `lib/games/engine.ts` exporta `GameEngine`, `GameEngineState` y `GameEngineFactory`; `GameEngine` incluye `forceGameOver`.
- [ ] `lib/games/asteroids.ts` exporta `createAsteroidsEngine` sin variables de estado a nivel de módulo (todo el estado vive dentro del closure de la instancia).
- [ ] `lib/games/registry.ts` mapea `"asteroid"` a `createAsteroidsEngine`.
- [ ] En `/jugar/asteroid`, mover la nave (flechas), propulsar (↑) y disparar (espacio) funciona igual que en el prototipo original, incluyendo el envolvimiento toroidal de bordes.
- [ ] Los asteroides grandes se parten en medianos y estos en pequeños al ser destruidos, sumando 20/50/100 puntos respectivamente.
- [ ] El escudo temporal y el disparo triple aparecen como power-ups recogibles y aplican su efecto (duración e indicador visual) igual que en el original.
- [ ] El HUD de React (`player-hud`) refleja score, vidas y nivel reales del engine, actualizándose en vivo; el canvas ya no dibuja su propio HUD superpuesto.
- [ ] El canvas no responde al teclado hasta que tiene foco; se muestra un overlay "CLIC PARA JUGAR" mientras no lo tiene, y reaparece si se pierde el foco durante la partida.
- [ ] El botón PAUSA congela el juego (nave/asteroides/balas quedan quietos) y REANUDAR lo retoma sin saltos de física.
- [ ] El botón FIN llama a `forceGameOver()`, que detiene el loop y dispara `onGameOver` con el score acumulado, abriendo el modal de fin de partida.
- [ ] Quedarse sin vidas (3 vidas agotadas) abre el mismo modal de fin de partida que el botón FIN, con el score real alcanzado.
- [ ] Al llegar a game over (por vidas agotadas o por `forceGameOver()`), presionar Espacio mientras el modal de fin de partida está abierto no reinicia la partida por detrás del modal — el motor queda detenido y solo "JUGAR DE NUEVO" (`restart()`) reinicia.
- [ ] "GUARDAR PUNTUACIÓN" en el modal llama a `saveScore({ game: "asteroid", score, name })` con el score real (verificable en `localStorage.av_scores`).
- [ ] "JUGAR DE NUEVO" reinicia completamente la partida (score 0, 3 vidas, nivel 1, nuevos asteroides).
- [ ] Los demás 7 juegos del catálogo (`/jugar/bloque-buster`, `/jugar/caida`, etc.) siguen mostrando el reproductor simulado actual sin cambios de comportamiento visible.
- [ ] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Id `"asteroid"` (inglés) en vez de `"asteroides"` (español)**: decisión explícita del usuario — rompe la convención del resto del catálogo (`bloque-buster`, `caida`, `serpentina`, etc., todos en español), pero se mantiene así porque es la forma en la que el usuario definió el renombrado.
- **Renombrar `"rocas"`/`"ROCAS"` a `"asteroid"`/`"ASTEROID"` en `lib/data.ts` como parte de este spec**: la entrada del catálogo ya existente para este juego (categoría SHOOTER, descripción "Pulveriza asteroides en gravedad cero") es la que se está reemplazando por Asteroids real; sin renombrarla, `GAME_ENGINES["asteroid"]` nunca encontraría coincidencia con ningún `game.id` del catálogo y la ruta `/jugar/asteroid` no existiría.
- **Generalizar con una interfaz `GameEngine` ahora, en vez de resolver solo "Asteroid" puntualmente**: decisión explícita del usuario — aunque hoy solo hay un juego real, se define el contrato (`start`/`stop`/`pause`/`resume`/`restart` + callbacks de estado) para que el próximo juego portado se conecte a `GamePlayer` sin rediseñar la integración.
- **Registro por `id` con fallback al mock (`GAME_ENGINES`)**: se descarta migrar los otros 7 juegos o eliminar el mock — no hay presupuesto en este spec para portarlos, y el fallback garantiza cero regresión visible en el resto del catálogo.
- **HUD único en React, HUD de canvas eliminado**: se descarta mantener el `drawHUD()` del original o mostrar ambos HUDs — mantiene consistencia visual con el resto del sitio (mismo look de `player-hud` que ya usan todos los juegos) y evita información duplicada.
- **Resolución interna fija 800×600 escalada por CSS, no coordenadas responsivas**: se preserva la física exacta del prototipo (velocidades, radios, spawn) sin riesgo de romper el balance del juego; el ajuste visual al marco `.crt-screen` (que ya es 4:3, la misma proporción de 800×600) se resuelve con CSS puro (`width/height: 100%` en el elemento canvas), sin tocar la lógica del juego.
- **Foco explícito en el canvas (click/tab) en vez de listeners globales en `window`**: se descarta el patrón original (listeners en `window` con `preventDefault` global) porque el juego ahora vive embebido en una página con botones y navegación alrededor — listeners globales capturarían las flechas incluso con el foco en otro control de la UI. El overlay "CLIC PARA JUGAR" comunica el requisito nuevo, ausente en el prototipo standalone.
- **Motor de estado propio por instancia (closure), no variables de módulo**: el original (`game.js`) usa variables `let` a nivel de módulo (`ship`, `score`, `state`, etc.), válido en una página standalone que carga el script una sola vez. En React, el componente puede montarse/desmontarse (navegación, Strict Mode) más de una vez por sesión de navegador, así que el estado se encapsula por instancia para evitar fugas entre partidas o entre remounts.
- **FIN fuerza game over con el score actual, no un modal de confirmación aparte**: mantiene el comportamiento más simple ya presente en el mock actual (un click, termina la partida), sin agregar un paso de confirmación no solicitado.
- **`forceGameOver()` explícito en la interfaz `GameEngine`, en vez de reutilizar `stop()` para el botón FIN**: `stop()` solo cancela el loop, no dispara `onGameOver` ni fija un score final — usarlo para FIN dejaría a `GamePlayer` sin forma estándar de obtener el score final vía el mismo canal (`onGameOver`) que usa el fin de partida por vidas agotadas. `forceGameOver()` se define como parte del contrato genérico para que cualquier motor futuro también lo soporte.
- **Eliminar el auto-restart por Space en `state === 'gameover'` (presente en el `game.js` original) en vez de conservarlo**: el original es una página standalone donde Space-para-reiniciar es la única forma de jugar de nuevo. Embebido en `GamePlayer`, el canvas puede conservar el foco mientras el modal de fin de partida de React está abierto; sin desactivar esa rama, una tecla Espacio reiniciaría el motor silenciosamente detrás del modal, desincronizando el estado del engine del score mostrado en el modal. El reinicio pasa a depender exclusivamente de `restart()`.

## Riesgos identificados

- El puerto de `game.js`/`shield.js`/`triple-shot.js` a un closure de TypeScript debe preservar el orden exacto de las comprobaciones de colisión (bala↔asteroide antes que nave↔asteroide, spawn de power-ups condicionado al mismo impacto) — un reordenamiento accidental podría cambiar sutilmente el balance o el orden de puntos otorgados.
- El manejo de foco (`tabIndex` + `onFocus`/`onBlur` en el `<canvas>`) puede comportarse distinto entre navegadores si el usuario interactúa con el modal de fin de partida (input de iniciales) mientras el canvas sigue en el DOM — mitigado por que el loop se detiene efectivamente al entrar en `'gameover'` (por vidas agotadas o `forceGameOver()`) y por eliminar la rama de auto-restart por Space del `update()` portado, para que una tecla presionada en ese momento no reintroduzca inputs ni reinicie el motor por detrás del modal.
- Cancelar/retomar `requestAnimationFrame` en `pause()`/`resume()` requiere resetear `lastTime` a `null` (como hace `initGame` originalmente) para evitar que el primer `dt` tras reanudar sea artificialmente grande (asteroides/nave "saltando" de posición).
