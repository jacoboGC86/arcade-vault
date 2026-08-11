# Propuesta A — Motor de Frogger ("FROGGER")

**Estado:** Propuesta (game jam)
**Depende de:** [[05-motor-de-juegos-y-asteroides]], [[06-leaderboard-supabase]]
**Fecha:** 2026-08-11
**Enfoque:** Port fiel y mínimo del Frogger de arcade (1981): tablero canónico, puntuación original al pie de la letra, 5 niveles finitos con victoria y cero mecánicas añadidas; reutiliza `GameEngineState` sin campos nuevos.

**Objetivo:** Renombrar el juego mock "RANARIA" (`id: "ranaria"`) del catálogo a "FROGGER" (`id: "frogger"`) y reemplazar su reproductor simulado por una implementación real de Frogger (cruce de 5 carriles de tráfico + 5 filas de río sobre troncos y tortugas hasta 5 nenúfares, con temporizador por intento) sobre el `<canvas>` 800×600 y el contrato `GameEngine` ya existentes, sin modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx` ni el leaderboard genérico de Supabase.

## Alcance

**Incluido:**

- Renombrar la entrada existente del catálogo en `lib/data.ts`: `id: "ranaria"` → `id: "frogger"`, `title: "RANARIA"` → `title: "FROGGER"`, `cover: "cover-rana"` → `cover: "cover-frogger"` (se mantienen `cat: "ARCADE"` y `color: "green"`); `short`/`long` se ajustan a la identidad "Frogger" sin cambiar la mecánica que ya describen (carriles de coches, troncos a la deriva, nenúfares y tiempo límite). Renombrar en consecuencia `.cover-rana`/`.cover-rana::after` en `app/globals.css` a `.cover-frogger`/`.cover-frogger::after`. Actualizar `app/page.tsx:29` (`g: "Ranaria"` → `g: "Frogger"`, fila de "Actividad en vivo").
- `lib/games/frogger.ts`: `createFroggerEngine(canvas): GameEngine` como closure sin variables de estado a nivel de módulo (mismo patrón que `lib/games/asteroids.ts`, `lib/games/tetris.ts` y `lib/games/arkanoid.ts`).
- **Tablero fijo** sobre el canvas 800×600, en rejilla de celdas de 40×40 px (20 columnas × 15 filas), de arriba abajo:
  - fila 0 (`y` 0–40): fila de casa con **5 nenúfares** de 80 px de ancho, centrados en `x` = 60, 220, 380, 540, 700; entre ellos, orilla sólida letal (no se puede aterrizar fuera de un nenúfar);
  - filas 1–5 (`y` 40–240): **río**, 5 filas de plataformas móviles;
  - fila 6 (`y` 240–280): **mediana segura** (sin obstáculos);
  - filas 7–11 (`y` 280–480): **carretera**, 5 carriles de vehículos;
  - fila 12 (`y` 480–520): **banco de salida** seguro; la rana reaparece siempre en la columna central (`x` = 380);
  - filas 13–14 (`y` 520–600): banda inferior dibujada dentro del canvas con la **barra de tiempo** del intento actual y los 5 nenúfares ya conquistados (ver Decisiones).
- **Controles:** `↑`/`↓`/`←`/`→`, un salto discreto de exactamente una celda (40 px) por pulsación (`keydown`), sin auto-repetición mientras la tecla sigue pulsada y sin movimiento continuo. La rana no puede salir del área jugable por los laterales ni bajar por debajo de la fila 12.
- **Carriles de tráfico** (de la mediana hacia abajo), con reaparición por el lado opuesto al salir de pantalla:
  - fila 7: camiones (2 celdas de ancho), 2 por carril, hacia la derecha, 70 px/s;
  - fila 8: coches rápidos (1 celda), 2 por carril, hacia la izquierda, 140 px/s;
  - fila 9: coches (1 celda), 3 por carril, hacia la derecha, 90 px/s;
  - fila 10: excavadoras (1,5 celdas), 3 por carril, hacia la izquierda, 75 px/s;
  - fila 11: coches lentos (1 celda), 3 por carril, hacia la derecha, 60 px/s.
  Tocar cualquier vehículo (solape de rectángulos) mata a la rana.
- **Río** (de la fila de casa hacia abajo), con reaparición por el lado opuesto:
  - fila 1: troncos medianos (3 celdas), hacia la derecha, 70 px/s;
  - fila 2: grupos de 2 tortugas, hacia la izquierda, 80 px/s, **sumergibles**;
  - fila 3: troncos largos (4 celdas), hacia la derecha, 55 px/s;
  - fila 4: troncos cortos (2 celdas), hacia la derecha, 95 px/s;
  - fila 5: grupos de 3 tortugas, hacia la izquierda, 65 px/s, **sumergibles**.
  Estar en una fila de río **sin** plataforma bajo la rana mata a la rana (agua). Estar sobre una plataforma **arrastra** a la rana con la velocidad y dirección de esa plataforma; si el arrastre la saca del canvas por un lateral, muere.
- **Tortugas sumergibles:** cada grupo cicla en 6 s — 4 s emergido, 1 s de aviso (dibujadas parpadeando, todavía sólidas), 1 s sumergido (no cuentan como plataforma). Los grupos de una misma fila no comparten fase.
- **Nenúfares:** aterrizar dentro de un nenúfar libre lo marca como conquistado, reinicia el intento (rana de vuelta al banco de salida, temporizador a 30 s) y suma puntos. Aterrizar sobre un nenúfar **ya conquistado**, o en la orilla entre nenúfares, mata a la rana.
- **Temporizador:** 30 s por intento, mostrado como barra que se vacía en la banda inferior. Llegar a 0 cuesta una vida. Se reinicia al morir y al conquistar un nenúfar.
- **Vidas:** 3 al iniciar. Se pierde una por atropello, agua, tortuga sumergida, arrastre fuera de pantalla, aterrizaje inválido en la fila de casa o fin de tiempo. Al llegar a `lives === 0` se dispara `onGameOver(score)`.
- **Puntuación (idéntica a la del arcade original):**
  - +10 por cada fila nueva alcanzada hacia arriba dentro del intento actual (solo la primera vez que se alcanza esa fila en ese intento; retroceder y volver a avanzar no vuelve a puntuar);
  - +50 por cada nenúfar conquistado;
  - +10 por cada medio segundo completo restante del temporizador al conquistar un nenúfar;
  - +1000 al conquistar los 5 nenúfares de un nivel.
- **Progresión:** 5 niveles finitos. Al conquistar los 5 nenúfares se sube de nivel, se vacían los nenúfares y la velocidad global de vehículos y plataformas pasa a `base × 1.12^(nivel - 1)`. Completar el nivel 5 (`TOTAL_LEVELS`) dispara `onGameOver(score)` con el score acumulado — misma equivalencia victoria/derrota que [[09-motor-arkanoid]], porque el contrato `GameEngine` no las distingue.
- **Estado del motor:** reutiliza `GameEngineState` (`score`/`lives`/`level`) **sin campos adicionales**; nenúfares conquistados y tiempo restante se dibujan dentro del canvas.
- `lib/games/registry.ts`: se agrega `frogger: createFroggerEngine`.
- Migración de Supabase actualizando la fila existente `('ranaria', 'RANARIA')` de la tabla `games` a `('frogger', 'FROGGER')` — ver Modelo de datos.

**Explícitamente fuera de alcance:**

- Cualquier otro juego del catálogo (`asteroid`, `tetris`, `arkanoid`, `serpentina`, `gloton`, `invasores`, `duelo-pixel`): los tres primeros siguen con su motor real ([[05-motor-de-juegos-y-asteroides]], [[08-motor-tetris]], [[09-motor-arkanoid]]) y el resto sigue con el `GamePlayer` simulado, sin cambio de comportamiento visible.
- **Mosca bonus, rana dama, serpiente, nutria, cocodrilos en el río y caimán en el nenúfar** — todos los extras del original quedan fuera; son justamente el terreno de la propuesta B.
- Power-ups de cualquier tipo (esta propuesta no tiene ninguno).
- Multiplicadores, combos o rachas: la puntuación es exactamente la del arcade, sin adaptaciones para el leaderboard.
- Escalada infinita de niveles: hay victoria al nivel 5 y ahí se acaba la partida.
- Extender `GameEngineState` con campos nuevos (patrón `TetrisEngineState`).
- Sonido y assets externos (sprites, spritesheets): todo se dibuja con formas vectoriales de canvas en el lenguaje neon del sitio, igual que Asteroids/Tetris/Arkanoid.
- Pausa/reinicio por teclado: ya los controla React vía `pause()`/`resume()`/`restart()`.
- Pantallas de inicio, pausa, nivel completado o game over dibujadas dentro del canvas: las cubren el overlay "CLIC PARA JUGAR" de `game-canvas.tsx` y el modal de fin de partida de `game-player.tsx`.
- Controles táctiles, móviles o de gamepad; solo teclado.
- Modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx`, `components/game-player.tsx` o el leaderboard genérico (`scores`, `/salon`): se reutilizan tal cual.

## Modelo de datos

```ts
// lib/games/frogger.ts — usa el contrato existente, no lo extiende
// Reutiliza GameEngineState sin campos adicionales: score/lives/level ya cubren
// puntaje, vidas restantes y nivel actual (1-5). Nenúfares conquistados y
// tiempo restante son estado interno del closure y se dibujan en el canvas.
```

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Record<string, GameEngineFactory> = {
  asteroid: createAsteroidsEngine,
  tetris: createTetrisEngine,
  arkanoid: createArkanoidEngine,
  frogger: createFroggerEngine,
};
```

Estado interno del closure de `createFroggerEngine` (sin variables de módulo): la rana (`col`/`row` lógicos, `x`/`y` en px para el arrastre sobre plataformas, `maxRowReached` del intento actual), los arreglos de vehículos y de plataformas de río (`x`/`y`/`w`/`speed`/`kind`, y para tortugas `phase`), los 5 nenúfares (`occupied: boolean`), y el temporizador del intento (`timeLeft` en segundos). No se introduce ninguna otra estructura de datos compartida fuera del motor.

Migración SQL sobre la fila existente de `games` (actualización en el lugar, mismo criterio que [[09-motor-arkanoid]] con `bloque-buster`):

```sql
update public.games set id = 'frogger', title = 'FROGGER' where id = 'ranaria';
```

## Plan de implementación

1. **Renombrar el catálogo**: en `lib/data.ts`, `id: "ranaria"` → `"frogger"`, `title: "RANARIA"` → `"FROGGER"`, `cover: "cover-rana"` → `"cover-frogger"` (mantener `cat: "ARCADE"`, `color: "green"`), ajustar `short`/`long` a la identidad Frogger. En `app/globals.css`, renombrar `.cover-rana*` a `.cover-frogger*`. En `app/page.tsx:29`, `"Ranaria"` → `"Frogger"`. Verificar que `/juegos/frogger` y `/jugar/frogger` resuelven.
2. **`lib/games/frogger.ts` — tablero y rana**: implementar la rejilla de 40 px, el dibujo de las bandas (casa, río, mediana, carretera, banco, banda inferior), el salto discreto por `keydown` y los límites del área jugable. Sin obstáculos todavía; el juego ya es navegable y el proyecto compila.
3. **Carriles de tráfico**: los 5 carriles con sus anchos, cantidades, direcciones y velocidades, con reaparición por el lado opuesto, y la colisión rana↔vehículo que resta una vida.
4. **Río**: las 5 filas de plataformas, el arrastre de la rana sobre tronco/tortuga, la muerte por agua y por salir arrastrada del canvas, y el ciclo de inmersión de 6 s de las tortugas.
5. **Nenúfares, temporizador y puntuación**: aterrizaje válido/inválido en la fila de casa, barra de tiempo de 30 s con muerte al agotarse, y la fórmula clásica completa (10 por fila nueva, 50 por nenúfar, 10 por medio segundo restante, 1000 por los 5). Cada cambio de `score`/`lives`/`level` dispara `onStateChange`.
6. **Niveles y fin de partida**: subida de nivel al completar los 5 nenúfares con factor de velocidad `1.12^(nivel - 1)`, victoria al terminar el nivel 5 y derrota a `lives === 0`, ambas vía `onGameOver(score)`. `forceGameOver()` produce el mismo efecto desde fuera, igual que en los tres motores ya existentes.
7. **`lib/games/registry.ts`**: agregar `frogger: createFroggerEngine`.
8. Ningún cambio en `components/games/game-canvas.tsx` ni `components/game-player.tsx`: la resolución por `GAME_ENGINES[game.id]` ya cubre este motor.
9. **Migración Supabase**: aplicar el `update` de la fila `ranaria` → `frogger` con `mcp__supabase__apply_migration` y confirmar con `mcp__supabase__list_tables` o consulta.
10. Verificación manual en `npm run dev`: jugar `/jugar/frogger` de punta a punta (cruzar la carretera, montar troncos y tortugas, ver sumergirse las tortugas, conquistar los 5 nenúfares, agotar el temporizador, perder las 3 vidas, completar el nivel 5, pausar/reanudar, FIN, guardar puntuación) y comprobar que `/jugar/arkanoid` sigue igual.
11. `npm run build` sin errores de TypeScript.

Cada paso deja el proyecto compilando; "FROGGER" solo queda jugable de verdad al completar el paso 7.

## Criterios de aceptación

- [ ] En `lib/data.ts` el juego tiene `id: "frogger"`, `title: "FROGGER"` y `cover: "cover-frogger"` (ya no `"ranaria"`/`"RANARIA"`/`"cover-rana"`); `.cover-frogger*` existe en `app/globals.css` y la fila de actividad en vivo de `app/page.tsx` muestra `"Frogger"`.
- [ ] `lib/games/frogger.ts` exporta `createFroggerEngine` sin variables de estado a nivel de módulo.
- [ ] `lib/games/registry.ts` mapea `"frogger"` a `createFroggerEngine`.
- [ ] El motor **no** define ningún tipo de estado extendido: `onStateChange` emite exactamente `GameEngineState` (`score`/`lives`/`level`).
- [ ] Cada pulsación de flecha mueve la rana exactamente una celda de 40 px; mantener la tecla pulsada no produce saltos adicionales.
- [ ] La rana no puede salir del canvas por los laterales ni bajar de la fila 12 (banco de salida).
- [ ] Los 5 carriles tienen las direcciones y velocidades descritas en Alcance y los vehículos reaparecen por el lado opuesto al salir de pantalla.
- [ ] Tocar un vehículo resta una vida y devuelve la rana al banco de salida con el temporizador reiniciado a 30 s.
- [ ] Estar en una fila de río sin plataforma debajo resta una vida (agua).
- [ ] Estar sobre un tronco o una tortuga emergida arrastra a la rana a la velocidad y dirección de esa plataforma; si el arrastre la saca del canvas por un lateral, resta una vida.
- [ ] Cada grupo de tortugas cicla 4 s emergido / 1 s parpadeando (aún sólido) / 1 s sumergido, y estar sobre él mientras está sumergido resta una vida.
- [ ] Aterrizar en un nenúfar libre lo marca como conquistado y suma 50 puntos más 10 por cada medio segundo restante del temporizador.
- [ ] Aterrizar en un nenúfar ya conquistado o en la orilla entre nenúfares resta una vida.
- [ ] Alcanzar por primera vez en el intento actual una fila más avanzada suma 10 puntos; retroceder y volver a subir a esa misma fila no suma de nuevo.
- [ ] Conquistar los 5 nenúfares suma 1000 puntos, sube de nivel, vacía los nenúfares y multiplica la velocidad global por 1,12 respecto al nivel anterior.
- [ ] Agotar el temporizador de 30 s resta una vida.
- [ ] Llegar a `lives === 0` dispara `onGameOver` con el score real y abre el modal de fin de partida.
- [ ] Completar el nivel 5 dispara `onGameOver` con el score real (victoria), sin estado de victoria separado.
- [ ] El HUD de React (`player-hud`) refleja score, vidas y nivel reales, actualizándose en vivo; el tiempo restante y los nenúfares conquistados se ven dentro del canvas.
- [ ] PAUSA congela vehículos, plataformas y temporizador; REANUDAR retoma sin saltos.
- [ ] FIN llama a `forceGameOver()` y abre el modal con el score acumulado real.
- [ ] "GUARDAR PUNTUACIÓN" llama a `saveScore({ game: "frogger", score, name })` y aparece la fila en `scores` con `game_id: "frogger"`.
- [ ] "JUGAR DE NUEVO" reinicia por completo (score 0, 3 vidas, nivel 1, 5 nenúfares libres, temporizador a 30 s).
- [ ] En Supabase, `games` contiene `('frogger', 'FROGGER')` y ya no contiene `('ranaria', 'RANARIA')`.
- [ ] `asteroid`, `tetris` y `arkanoid` siguen con su motor real sin cambios; `serpentina`, `gloton`, `invasores` y `duelo-pixel` siguen con el reproductor simulado.
- [ ] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Frente a la propuesta B**: A gana previsibilidad y coste — es el juego que la gente reconoce, con la puntuación exacta del arcade, sin entidades nuevas ni estado extendido, y con una condición de victoria clara al nivel 5. Pierde profundidad de leaderboard: sin combos ni escalada infinita, un jugador experto topa contra el nivel 5 y los scores altos se comprimen alrededor del mismo techo (≈15–20 k), con menos separación en `/salon` que en la propuesta B.
- **`id: "frogger"` en inglés en vez de conservar `ranaria`**: sigue el patrón ya establecido del repo (`rocas`→`asteroid`, `caida`→`tetris`, `bloque-buster`→`arkanoid`) y el id sugerido explícitamente por el usuario. La nota de marca de `references/game-todo.md` (Frogger es marca de Konami) se recoge en Riesgos, no cambia la decisión.
- **Reemplazar la entrada `ranaria` en vez de crear una nueva**: su `long` ya narra exactamente esta mecánica ("Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo"), misma detección automática que `caida`→`tetris`.
- **Reutilizar `GameEngineState` sin extenderlo**: el HUD de `game-player.tsx` solo pinta score/vidas/nivel, así que cualquier campo extra habría que dibujarlo igualmente en el canvas; con solo dos datos extra (tiempo y nenúfares) no compensa introducir un tipo `FroggerEngineState`.
- **Temporizador y nenúfares dibujados en la banda inferior del canvas**: mismo criterio que la vista previa de la siguiente pieza de [[08-motor-tetris]], que también vive dentro del único canvas 800×600 en vez de pedir un segundo lienzo o campos nuevos de HUD.
- **Salto discreto por `keydown` sin auto-repetición**: es la sensación del original y evita que la repetición del sistema operativo dispare 20 saltos por segundo; se descartó el movimiento continuo estilo Arkanoid porque rompería tanto el juego como la puntuación por fila.
- **Victoria (nivel 5 completado) mapeada a `onGameOver(score)`**: el contrato no distingue ganar de perder y el modal de fin ya cubre ambos casos, exactamente como se decidió en [[09-motor-arkanoid]].
- **Se descartan mosca, rana dama, serpiente y cocodrilos**: son bonus del original, pero cada uno añade una entidad y un caso de colisión propio; mantenerlos fuera es lo que hace de esta propuesta la de menor esfuerzo. Están en la propuesta B.
- **5 niveles, no infinitos**: reproduce el arco corto y cerrado de Arkanoid (3 niveles) y da una partida acotada; la escalada infinita es el terreno de la propuesta B.

## Riesgos identificados

- **Colisión "ir montado sobre el tronco"**: es el único caso en el catálogo donde la posición de la rana depende de la de otra entidad. El orden de comprobaciones importa — mover plataformas, luego arrastrar la rana, luego comprobar agua/límites — y hacerlo al revés produce muertes fantasma al borde del tronco. Definir la regla exacta de solape (el centro de la rana debe caer dentro del rectángulo de la plataforma) antes de implementar.
- **Puntuación dependiente del tiempo**: el bonus de 10 puntos por medio segundo restante hace que el score dependa del reloj real. Si el `requestAnimationFrame` se ralentiza (pestaña en segundo plano, monitor a 144 Hz), el temporizador debe descontarse con `deltaTime` acumulado y no por frames, o los scores dejarán de ser comparables entre máquinas en `/salon`.
- **Scores históricos con `game_id = 'ranaria'`**: si existieran filas en `scores` con el id viejo, el `update` de `games` las dejaría huérfanas del catálogo. Comprobarlo antes de migrar y, si las hay, migrarlas en el mismo paso (`update scores set game_id = 'frogger' where game_id = 'ranaria'`).
- **Marca registrada**: "Frogger" es marca viva de Konami; `references/game-todo.md` recomendaba conservar el nombre en español (`RANARIA`). Esta propuesta adopta `frogger` por coherencia con el resto del repo, pero el título de catálogo es reversible sin tocar el motor si el usuario prefiere lo contrario.
