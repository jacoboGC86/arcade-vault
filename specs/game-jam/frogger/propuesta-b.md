# Propuesta B — Motor de Frogger ("FROGGER")

**Estado:** Propuesta (game jam)
**Depende de:** [[05-motor-de-juegos-y-asteroides]], [[06-leaderboard-supabase]]
**Fecha:** 2026-08-11
**Enfoque:** Variante ampliada pensada para el leaderboard: mismo tablero canónico, pero con mosca bonus, serpiente y dos power-ups recogibles, puntuación con multiplicador de racha, escalada infinita de niveles y un `FroggerEngineState` extendido (patrón `TetrisEngineState`).

**Objetivo:** Renombrar el juego mock "RANARIA" (`id: "ranaria"`) del catálogo a "FROGGER" (`id: "frogger"`) y reemplazar su reproductor simulado por una implementación real de Frogger ampliada (cruce de 5 carriles + 5 filas de río, 5 nenúfares, temporizador por intento, mosca bonus, serpiente, power-ups y rachas) sobre el `<canvas>` 800×600 y el contrato `GameEngine` ya existentes, sin modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx` ni el leaderboard genérico de Supabase.

## Alcance

**Incluido:**

- Renombrar la entrada existente del catálogo en `lib/data.ts`: `id: "ranaria"` → `id: "frogger"`, `title: "RANARIA"` → `title: "FROGGER"`, `cover: "cover-rana"` → `cover: "cover-frogger"` (se mantienen `cat: "ARCADE"` y `color: "green"`); `short`/`long` se ajustan a la identidad "Frogger" y mencionan la escalada infinita. Renombrar `.cover-rana`/`.cover-rana::after` en `app/globals.css` a `.cover-frogger`/`.cover-frogger::after`. Actualizar `app/page.tsx:29` (`g: "Ranaria"` → `g: "Frogger"`).
- `lib/games/frogger.ts`: `createFroggerEngine(canvas): GameEngine` como closure sin variables de estado a nivel de módulo (mismo patrón que `asteroids.ts`/`tetris.ts`/`arkanoid.ts`).
- **Tablero fijo** sobre el canvas 800×600, rejilla de 40×40 px (20 columnas × 15 filas), idéntico al de la propuesta A:
  - fila 0: fila de casa con **5 nenúfares** de 80 px, centrados en `x` = 60, 220, 380, 540, 700; orilla letal entre ellos;
  - filas 1–5: **río** (5 filas de plataformas móviles);
  - fila 6: **mediana** (segura salvo por la serpiente, ver abajo);
  - filas 7–11: **carretera** (5 carriles);
  - fila 12: **banco de salida** seguro, reaparición en `x` = 380;
  - filas 13–14: banda inferior dibujada en canvas con la barra de tiempo, los nenúfares conquistados, el multiplicador de racha activo y los power-ups en curso.
- **Controles:** `↑`/`↓`/`←`/`→`, un salto discreto de una celda por pulsación (`keydown`), sin auto-repetición. Los power-ups no tienen tecla: se activan al recogerlos.
- **Carriles de tráfico** (de la mediana hacia abajo), con reaparición por el lado opuesto: fila 7 camiones (2 celdas, 2/carril, derecha, 70 px/s); fila 8 coches rápidos (1 celda, 2/carril, izquierda, 140 px/s); fila 9 coches (1 celda, 3/carril, derecha, 90 px/s); fila 10 excavadoras (1,5 celdas, 3/carril, izquierda, 75 px/s); fila 11 coches lentos (1 celda, 3/carril, derecha, 60 px/s). Tocar un vehículo mata a la rana (salvo escudo activo).
- **Río**: fila 1 troncos medianos (3 celdas, derecha, 70 px/s); fila 2 grupos de 2 tortugas (izquierda, 80 px/s, sumergibles); fila 3 troncos largos (4 celdas, derecha, 55 px/s); fila 4 troncos cortos (2 celdas, derecha, 95 px/s); fila 5 grupos de 3 tortugas (izquierda, 65 px/s, sumergibles). Sin plataforma debajo = agua = muerte; sobre plataforma, la rana es arrastrada con ella y muere si sale del canvas por un lateral.
- **Tortugas sumergibles:** ciclo de 6 s — 4 s emergido, 1 s parpadeando (aún sólido), 1 s sumergido. Los grupos de una fila no comparten fase.
- **Mecánica añadida 1 — Mosca bonus:** cada 8 s aparece una mosca sobre un nenúfar libre elegido al azar y permanece 6 s. Conquistar ese nenúfar mientras la mosca está presente suma **200 puntos** extra (antes de aplicar el multiplicador de racha) y consume la mosca. Nunca hay más de una mosca a la vez.
- **Mecánica añadida 2 — Serpiente en la mediana:** a partir del nivel 3 recorre la fila 6 una serpiente (1,5 celdas) que rebota de un lateral al otro a 55 px/s × factor de velocidad del nivel. Tocarla mata a la rana. La mediana sigue siendo segura en los niveles 1 y 2.
- **Mecánica añadida 3 — Power-ups recogibles** (mismo espíritu que el escudo/triple disparo de [[05-motor-de-juegos-y-asteroides]]): cada 12 s aparece un power-up montado sobre un tronco al azar del río y viaja con él hasta salir de pantalla. Se recoge saltando sobre él. Solo hay uno en pantalla a la vez y solo dos tipos, elegidos con igual probabilidad:
  - **RELOJ** — devuelve 8 s al temporizador del intento actual, sin superar su valor inicial;
  - **ESCUDO** — la siguiente muerte por vehículo, agua, tortuga sumergida o serpiente no resta vida: la rana vuelve al banco de salida, el temporizador se reinicia y la racha **no** se rompe. Dura hasta consumirse; no se acumula (recoger un segundo escudo con uno activo no suma).
- **Multiplicador de racha:** cuenta los nenúfares conquistados consecutivamente **sin morir**, dentro de la partida (no solo del nivel). Multiplicador = 1,0 / 1,5 / 2,0 / 2,5 / 3,0 para racha 0 / 1 / 2 / 3 / 4 o más; tope en 3,0. Cualquier muerte que reste vida devuelve la racha a 0 (un escudo consumido la preserva).
- **Puntuación (adaptada al leaderboard, base clásica × racha):**
  - +10 por cada fila nueva alcanzada hacia arriba dentro del intento actual (solo la primera vez en ese intento), **sin** multiplicador;
  - al conquistar un nenúfar: `(50 + 20 × medios_segundos_restantes + 200_si_mosca) × multiplicador`, redondeado hacia abajo;
  - al conquistar los 5 nenúfares de un nivel: `500 × nivel` de bonus de nivel, además del bonus clásico de 1000.
- **Progresión infinita:** no hay victoria. Al completar los 5 nenúfares se sube de nivel sin tope, se vacían los nenúfares, la serpiente aparece desde el nivel 3 y el temporizador base baja 1 s por nivel desde 25 s hasta un mínimo de 15 s. El factor de velocidad reproduce el ciclo "más difícil, respiro, más difícil" del original:
  `velocidad = base × 1.08^((nivel - 1) mod 5) × 1.15^floor((nivel - 1) / 5)`.
  La partida termina solo al agotar las vidas.
- **Vidas:** 3 al iniciar. Se pierde una por atropello, agua, tortuga sumergida, serpiente, arrastre fuera de pantalla, aterrizaje inválido en la fila de casa o fin de tiempo (salvo escudo activo, que absorbe la primera de ellas). `lives === 0` dispara `onGameOver(score)`.
- **Estado del motor extendido** con `FroggerEngineState extends GameEngineState` (`homes`, `timeLeft`, `multiplier`, `shielded`), emitido por `onStateChange` y dibujado dentro del canvas — ver Modelo de datos. `components/game-player.tsx` sigue leyendo solo `score`/`lives`/`level`, sin cambios, exactamente como ya ocurre con `lines`/`bestCombo` de [[08-motor-tetris]].
- `lib/games/registry.ts`: se agrega `frogger: createFroggerEngine`.
- Migración de Supabase actualizando `('ranaria', 'RANARIA')` a `('frogger', 'FROGGER')` en la tabla `games`.

**Explícitamente fuera de alcance:**

- Cualquier otro juego del catálogo (`asteroid`, `tetris`, `arkanoid`, `serpentina`, `gloton`, `invasores`, `duelo-pixel`): los tres primeros conservan su motor real ([[05-motor-de-juegos-y-asteroides]], [[08-motor-tetris]], [[09-motor-arkanoid]]) y el resto el `GamePlayer` simulado.
- **Rana dama** (pasajera que se escolta a casa), **cocodrilos** que sustituyen troncos, **caimán** en el nenúfar y **nutria**: extras del original que se descartan para no pasar del techo de complejidad de Tetris/Arkanoid; ver Decisiones.
- Condición de victoria y nivel final: esta propuesta no tiene final, solo derrota.
- Persistir la racha, el mejor multiplicador o el nivel máximo en Supabase: solo se guarda el `score` numérico final, con el flujo genérico de [[06-leaderboard-supabase]].
- Mostrar `homes`/`timeLeft`/`multiplier`/`shielded` en el HUD de React: se dibujan en la banda inferior del canvas; `components/game-player.tsx` no se toca.
- Sonido y assets externos (sprites): todo con formas vectoriales de canvas en el lenguaje neon del sitio.
- Pausa/reinicio por teclado; ya los controla React vía `pause()`/`resume()`/`restart()`.
- Pantallas de inicio/pausa/nivel/game over dentro del canvas: las cubren el overlay "CLIC PARA JUGAR" y el modal de fin de partida.
- Controles táctiles, móviles o de gamepad; solo teclado.
- Modificar `lib/games/engine.ts`, `components/games/game-canvas.tsx` o el leaderboard genérico (`scores`, `/salon`).

## Modelo de datos

```ts
// lib/games/frogger.ts — extiende el contrato existente, no lo reemplaza
export interface FroggerEngineState extends GameEngineState {
  homes: number;       // nenúfares conquistados del nivel actual (0-5)
  timeLeft: number;    // segundos restantes del intento actual
  multiplier: number;  // multiplicador de racha vigente (1, 1.5, 2, 2.5, 3)
  shielded: boolean;   // hay un ESCUDO sin consumir
}
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

Resto del estado interno del closure (sin variables de módulo): la rana (`col`/`row`, `x`/`y` en px para el arrastre, `maxRowReached` del intento), vehículos y plataformas de río (`x`/`y`/`w`/`speed`/`kind`, `phase` en tortugas), los 5 nenúfares (`occupied`), la mosca (`homeIndex`/`ttl`), la serpiente (`x`/`dir`, solo desde nivel 3), el power-up activo en el río (`kind`/`platformRef`) y la racha (`streak`). No hay ninguna otra estructura de datos nueva fuera del motor.

Migración SQL sobre la fila existente de `games` (actualización en el lugar, mismo criterio que [[09-motor-arkanoid]]):

```sql
update public.games set id = 'frogger', title = 'FROGGER' where id = 'ranaria';
```

## Plan de implementación

1. **Renombrar el catálogo**: `lib/data.ts` (`id`/`title`/`cover`/`short`/`long`), `.cover-rana*` → `.cover-frogger*` en `app/globals.css`, `"Ranaria"` → `"Frogger"` en `app/page.tsx:29`. Verificar `/juegos/frogger` y `/jugar/frogger`.
2. **`lib/games/frogger.ts` — tablero y rana**: rejilla de 40 px, dibujo de las bandas (casa, río, mediana, carretera, banco, banda inferior), salto discreto por `keydown`, límites del área jugable. Sin obstáculos aún.
3. **Carriles de tráfico**: los 5 carriles con anchos/cantidades/direcciones/velocidades, reaparición por el lado opuesto, colisión rana↔vehículo.
4. **Río**: las 5 filas de plataformas, arrastre de la rana, muerte por agua y por salir del canvas, ciclo de inmersión de 6 s de las tortugas.
5. **Nenúfares, temporizador y puntuación base**: aterrizaje válido/inválido en la fila de casa, barra de tiempo, puntuación por fila nueva y por nenúfar sin multiplicador todavía. `onStateChange` empieza a emitir `FroggerEngineState`.
6. **Racha y multiplicador**: contador de nenúfares consecutivos sin morir, tabla 1,0–3,0, reset en muerte, aplicación al bonus de nenúfar, y dibujo del multiplicador en la banda inferior.
7. **Mosca bonus**: aparición cada 8 s sobre un nenúfar libre, vida de 6 s, +200 antes del multiplicador al conquistar ese nenúfar.
8. **Serpiente**: entidad de la mediana desde el nivel 3, rebote lateral, colisión letal.
9. **Power-ups RELOJ y ESCUDO**: aparición cada 12 s montados en un tronco, recogida por solape, efecto de cada uno, indicador en la banda inferior, y la regla de que un escudo consumido preserva la racha.
10. **Progresión infinita**: subida de nivel al completar los 5 nenúfares, bonus `500 × nivel`, temporizador base decreciente (25 s → 15 s) y la fórmula cíclica de velocidad. `onGameOver(score)` solo a `lives === 0`; `forceGameOver()` con el mismo efecto desde fuera.
11. **`lib/games/registry.ts`**: agregar `frogger: createFroggerEngine`.
12. Ningún cambio en `components/games/game-canvas.tsx` ni `components/game-player.tsx`: `GAME_ENGINES[game.id]` ya cubre este motor y los campos extra del estado se ignoran en el HUD, igual que los de Tetris.
13. **Migración Supabase**: aplicar el `update` de `ranaria` → `frogger` con `mcp__supabase__apply_migration` y confirmar con `mcp__supabase__list_tables` o consulta.
14. Verificación manual en `npm run dev`: partida completa en `/jugar/frogger` (carretera, río, tortugas sumergidas, mosca, serpiente en el nivel 3, ambos power-ups, subir al menos al nivel 6 para ver el "respiro" de velocidad, romper y recuperar la racha, perder las 3 vidas, pausar/reanudar, FIN, guardar puntuación) y comprobar que `/jugar/arkanoid` sigue igual.
15. `npm run build` sin errores de TypeScript.

Cada paso deja el proyecto compilando; "FROGGER" queda jugable a partir del paso 11 y completo al 13.

## Criterios de aceptación

- [ ] En `lib/data.ts` el juego tiene `id: "frogger"`, `title: "FROGGER"` y `cover: "cover-frogger"`; `.cover-frogger*` existe en `app/globals.css` y la actividad en vivo de `app/page.tsx` muestra `"Frogger"`.
- [ ] `lib/games/frogger.ts` exporta `createFroggerEngine` sin variables de estado a nivel de módulo.
- [ ] `lib/games/frogger.ts` exporta `FroggerEngineState extends GameEngineState` con `homes`, `timeLeft`, `multiplier` y `shielded`, y `onStateChange` los emite en vivo sin modificar `lib/games/engine.ts`.
- [ ] `lib/games/registry.ts` mapea `"frogger"` a `createFroggerEngine`.
- [ ] Cada pulsación de flecha mueve la rana exactamente una celda de 40 px; mantener la tecla pulsada no produce saltos adicionales.
- [ ] Los 5 carriles tienen las direcciones y velocidades descritas en Alcance, con reaparición por el lado opuesto; tocar un vehículo resta una vida (o consume el escudo).
- [ ] Estar en una fila de río sin plataforma debajo resta una vida; estar sobre tronco o tortuga emergida arrastra a la rana con la plataforma, y salir del canvas arrastrada resta una vida.
- [ ] Cada grupo de tortugas cicla 4 s emergido / 1 s parpadeando / 1 s sumergido, y estar sobre él sumergido resta una vida.
- [ ] Aparece como máximo una mosca a la vez, cada 8 s, sobre un nenúfar libre, y desaparece a los 6 s; conquistar ese nenúfar con la mosca presente suma 200 puntos extra antes del multiplicador.
- [ ] Desde el nivel 3 hay una serpiente recorriendo la mediana y rebotando entre laterales; tocarla resta una vida. En los niveles 1 y 2 la mediana no tiene serpiente.
- [ ] Aparece como máximo un power-up a la vez, cada 12 s, montado en un tronco, y se recoge saltando sobre él.
- [ ] RELOJ devuelve 8 s al temporizador sin superar el valor inicial del intento.
- [ ] ESCUDO absorbe la siguiente muerte (vehículo, agua, tortuga sumergida o serpiente) sin restar vida ni romper la racha, se consume al hacerlo y no se acumula.
- [ ] El multiplicador vale 1,0 / 1,5 / 2,0 / 2,5 / 3,0 según 0/1/2/3/4+ nenúfares consecutivos sin morir, con tope en 3,0, y vuelve a 1,0 tras cualquier muerte que reste vida.
- [ ] Conquistar un nenúfar suma `(50 + 20 × medios_segundos_restantes + 200_si_mosca) × multiplicador`, redondeado hacia abajo.
- [ ] Alcanzar por primera vez en el intento una fila más avanzada suma 10 puntos sin multiplicador; retroceder y volver a subir no vuelve a sumar.
- [ ] Conquistar los 5 nenúfares suma 1000 más `500 × nivel`, sube de nivel y vacía los nenúfares.
- [ ] La velocidad global sigue `base × 1.08^((nivel - 1) mod 5) × 1.15^floor((nivel - 1) / 5)`: el nivel 6 es más lento que el 5 y más rápido que el 1.
- [ ] El temporizador base parte de 25 s y baja 1 s por nivel hasta quedarse en 15 s; agotarlo resta una vida.
- [ ] No existe condición de victoria: la partida solo termina con `lives === 0` (o con FIN), disparando `onGameOver` con el score real.
- [ ] El HUD de React (`player-hud`) refleja score, vidas y nivel reales; tiempo, nenúfares, multiplicador y escudo se ven dentro del canvas, sin tocar `components/game-player.tsx`.
- [ ] PAUSA congela vehículos, plataformas, serpiente, temporizador y temporizadores de mosca/power-up; REANUDAR retoma sin saltos.
- [ ] FIN llama a `forceGameOver()` y abre el modal con el score acumulado real.
- [ ] "GUARDAR PUNTUACIÓN" llama a `saveScore({ game: "frogger", score, name })` y aparece la fila en `scores` con `game_id: "frogger"`.
- [ ] "JUGAR DE NUEVO" reinicia por completo (score 0, 3 vidas, nivel 1, 5 nenúfares libres, racha 0, sin escudo, sin mosca ni power-up en pantalla).
- [ ] En Supabase, `games` contiene `('frogger', 'FROGGER')` y ya no contiene `('ranaria', 'RANARIA')`.
- [ ] `asteroid`, `tetris` y `arkanoid` siguen con su motor real sin cambios; `serpentina`, `gloton`, `invasores` y `duelo-pixel` siguen con el reproductor simulado.
- [ ] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Frente a la propuesta A**: B gana rango y rejugabilidad en el leaderboard — la escalada infinita y el multiplicador de racha separan de verdad al jugador bueno del regular en `/salon`, y la mosca, la serpiente y los power-ups dan decisiones tácticas ("¿arriesgo por la mosca o me llevo el tiempo?"). Pierde fidelidad y coste: los scores ya no son comparables con los del arcade original, hay tres entidades y un estado extendido más que mantener, y el balance (frecuencias de aparición, tope de multiplicador) necesita una pasada de ajuste manual que A no necesita.
- **`id: "frogger"` en inglés en vez de conservar `ranaria`**: mismo patrón del repo (`rocas`→`asteroid`, `caida`→`tetris`, `bloque-buster`→`arkanoid`) y el id sugerido explícitamente por el usuario; la nota de marca de `references/game-todo.md` se recoge en Riesgos.
- **Reemplazar la entrada `ranaria` en vez de crear una nueva**: su `long` ya narra esta mecánica exacta, misma detección automática que `caida`→`tetris`.
- **Extender `GameEngineState` en vez de guardar todo en el closure**: sigue el precedente de `TetrisEngineState` (`lines`/`bestCombo`) y deja el estado ampliado disponible para un HUD futuro sin obligar a cambiarlo ahora; el contrato `GameEngine` no se toca porque `onStateChange` es covariante en el tipo de estado emitido.
- **Solo dos power-ups (RELOJ y ESCUDO)**: espeja exactamente el par escudo/triple disparo de Asteroids, que ya demostró que dos power-ups bastan para dar variedad sin explotar el balance. Un tercero (p. ej. "salto doble") habría requerido tecla propia y cambios en el esquema de control.
- **Se descartan rana dama, cocodrilos, caimán y nutria**: la rana dama obliga a un estado de "pasajero" que altera todas las colisiones; cocodrilos y caimán duplican la lógica de plataforma con zonas letales parciales. Con la mosca, la serpiente y los power-ups ya se cubre la sensación de "hay más cosas pasando" sin pasar del techo de Tetris/Arkanoid.
- **Multiplicador tope 3,0 y por partida, no por nivel**: un multiplicador sin tope haría que una sola partida perfecta dominara el leaderboard para siempre; contarlo por partida (y no reiniciarlo al subir de nivel) premia la consistencia sin regalar puntos.
- **Sin condición de victoria**: es la diferencia deliberada con [[09-motor-arkanoid]] y con la propuesta A — el juego mide cuánto aguantas, que es lo que un ranking global sabe ordenar.
- **Los campos extra no se muestran en el HUD de React**: `components/game-player.tsx` es genérico para todos los juegos; añadir campos específicos de Frogger lo ensuciaría. Se dibujan en la banda inferior del canvas, igual que la vista previa de pieza de [[08-motor-tetris]].

## Riesgos identificados

- **Balance sin datos**: las frecuencias (mosca cada 8 s, power-up cada 12 s), el valor del RELOJ (8 s) y la tabla de multiplicadores están puestos a ojo, no portados de un original. Es muy probable que la primera versión resulte o trivial o injusta y haya que ajustarla tras jugar; conviene dejarlos como constantes con nombre en la cabecera del archivo para poder tocarlos sin buscar.
- **Interacción escudo × racha**: la regla "un escudo consumido preserva la racha" es la que más puede inflar el score si se combina con power-ups frecuentes. Si al probar se ve que el multiplicador se queda clavado en 3,0, la primera palanca a bajar es la frecuencia de aparición del escudo, no el tope del multiplicador.
- **Colisión "ir montado sobre el tronco"**: único caso del catálogo donde la posición de la rana depende de otra entidad. El orden debe ser mover plataformas → arrastrar rana → comprobar agua/límites; invertirlo produce muertes fantasma en el borde del tronco. Con power-ups montados sobre troncos, además, el power-up y la rana deben moverse con la misma plataforma para que la recogida sea posible.
- **Puntuación dependiente del tiempo**: el bonus de 20 puntos por medio segundo hace que el score dependa del reloj real; el temporizador debe descontarse con `deltaTime` acumulado y no por frames, o los scores dejarán de ser comparables en `/salon` entre monitores de distinta tasa de refresco.
- **Escalada infinita y desbordes visuales**: sin nivel final, `level` y `score` crecen sin límite; comprobar que el HUD (`String(level).padStart(2, "0")`) y la banda inferior siguen legibles a partir del nivel 100 y que la velocidad de plataformas no supera los 40 px por frame (una celda), o la colisión discreta empezará a atravesar objetos.
- **Scores históricos con `game_id = 'ranaria'`**: si existieran filas en `scores` con el id viejo, el `update` de `games` las dejaría huérfanas; comprobarlo antes de migrar y, si las hay, migrarlas en el mismo paso.
- **Marca registrada**: "Frogger" es marca viva de Konami; `references/game-todo.md` recomendaba conservar `RANARIA`. El título de catálogo es reversible sin tocar el motor.
