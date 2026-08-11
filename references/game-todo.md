# Backlog de juegos — Arcade Vault

Memoria de `game-planner` (`.claude/agents/game-planner.md`). Fuente de verdad de qué
juegos se han sugerido, aprobado o descartado. El agente lee este archivo antes de
sugerir nada y actualiza filas existentes en vez de duplicarlas.

**Estados:** `sugerido` (propuesto, sin decidir) · `aprobado` (el usuario dio el visto
bueno; listo para `/add-game`) · `spec` (spec escrito en `specs/`) · `implementado`
(motor real en `lib/games/registry.ts`) · `descartado` (con motivo).

Solo el usuario mueve una fila de `sugerido` a `aprobado` o `descartado`.

## Candidatos

| Prioridad | Juego | Categoría | Estado | Esfuerzo | Por qué encaja |
| --- | --- | --- | --- | --- | --- |
| 1 | Space Invaders (`invasores`) | SHOOTER | sugerido | M | Reemplaza un mock cuya descripción ya narra la mecánica; score acumulativo canónico, ideal para el leaderboard; complejidad calibrada al nivel de Arkanoid. |
| 2 | Snake (`serpentina`) | ARCADE | sugerido | S | El motor más barato del backlog: grid, 4 teclas, score acumulativo puro; cero riesgo de marca. |
| 3 | Pac-Man (`gloton`) | ARCADE | sugerido | L | Gran valor de catálogo (laberinto + IA de persecución, mecánica ausente), pero es el candidato más caro y con más riesgo de marca. |
| 4 | Frogger (`ranaria`) | ARCADE | aprobado | M | Carriles y troncos son fáciles; el score por tiempo/llegada y la marca de Konami lo complican. |
| 5 | Pong (`duelo-pixel`) | VERSUS | sugerido | S | Único candidato de la categoría VERSUS, pero su score (a 11 puntos) no es comparable en un leaderboard global. |

### Space Invaders (`invasores`)

- **Mecánica:** Formación de 5×11 alienígenas que desciende y acelera conforme quedan menos; el jugador mueve un cañón horizontal en la base y dispara hacia arriba. Cuatro búnkeres destructibles absorben disparos de ambos bandos. Un OVNI cruza la parte superior de forma periódica. Se pierde al agotar las vidas o si la formación toca la superficie.
- **Controles:** `←`/`→` mover cañón, `Espacio` disparar (un solo disparo del jugador en pantalla a la vez, como el original).
- **Score:** 10 pts (2 filas inferiores), 20 pts (2 filas medias), 30 pts (fila superior) = 990 pts por oleada; OVNI entre 50 y 300 pts. Acumulativo, monótono creciente, una sola partida — encaje perfecto con `scores`.
- **Catálogo:** reemplaza el mock `invasores` de `lib/data.ts` (`cat: SHOOTER`, `color: green`, `cover: cover-invaders`); su `long` ya describe "olas de pixeles hostiles descienden formación tras formación... mueve tu cañón en horizontal".
- **Riesgos:** "Space Invaders" es marca de Taito — conservar el título en español `INVASORES` y el id `invasores` (rompe el patrón `rocas`→`asteroid` / `caida`→`tetris` de renombrar al nombre inglés; decisión del usuario). La aceleración de la formación depende del número de invasores vivos, no de un temporizador: si se implementa mal, el juego se siente roto. Búnkeres destructibles pixel a pixel = la parte cara; podrían simplificarse a bloques por celdas.

### Snake (`serpentina`)

- **Mecánica:** Serpiente sobre grid que avanza a paso fijo; comer un núcleo la alarga y sube la velocidad. Se pierde al chocar con muros o con el propio cuerpo.
- **Controles:** `←`/`→`/`↑`/`↓` para girar (sin giro de 180°).
- **Score:** puntos fijos por comida (p. ej. 10) más bonus proporcional a la velocidad/nivel actual.
- **Catálogo:** reemplaza el mock `serpentina` (`cat: ARCADE`, `color: green`); su `long` ya narra exactamente esta mecánica.
- **Riesgos:** casi ninguno técnico. El riesgo es de producto: aporta poca novedad mecánica frente a lo ya implementado y `lives` del `GameEngineState` quedaría siempre en 1 (o sin usar).

### Pac-Man (`gloton`)

- **Mecánica:** Laberinto con puntos, cuatro fantasmas con patrones de persecución distintos, píldoras de poder que invierten la relación durante unos segundos.
- **Controles:** flechas para elegir dirección (movimiento continuo con giro encolado en la intersección).
- **Score:** 10 pts por punto, 50 por píldora, fantasmas comidos 200/400/800/1600 dentro de la misma píldora, frutas bonus.
- **Catálogo:** reemplaza el mock `gloton` (`cat: ARCADE`, `color: yellow`).
- **Riesgos:** esfuerzo `L` — el laberinto (datos + colisión por celdas), el movimiento en rejilla y sobre todo las cuatro IAs con modos scatter/chase son mucho más trabajo que Arkanoid o Tetris. Marca registrada de Bandai Namco: mantener el nombre `GLOTÓN`.

### Frogger (`ranaria`)

- **Mecánica:** Cruzar carriles de tráfico y un río sobre troncos/tortugas hasta llegar a cinco nenúfares, con temporizador por intento.
- **Controles:** flechas, un salto discreto por pulsación.
- **Score:** puntos por avanzar de fila, bonus por nenúfar completado y por tiempo restante.
- **Catálogo:** reemplaza el mock `ranaria` (`cat: ARCADE`, `color: green`).
- **Riesgos:** marca de Konami. El score depende de un temporizador, lo que hace las partidas menos comparables que un shooter puro; la mecánica de "ir montado sobre el tronco" añade un caso de colisión que el resto de motores no tiene.

### Pong (`duelo-pixel`)

- **Mecánica:** Dos paletas verticales, una pelota; contra CPU o a dos jugadores en el mismo teclado.
- **Controles:** `W`/`S` jugador 1, `↑`/`↓` jugador 2 (o CPU).
- **Score:** puntos ganados en el set (típicamente a 11).
- **Catálogo:** reemplaza el mock `duelo-pixel` (`cat: VERSUS`, `color: cyan`).
- **Riesgos:** **encaje débil con el leaderboard** — el score tope es ~11 y no crece con la habilidad, así que `/salon` se llenaría de empates; un modo alternativo (rallies aguantados, tiempo de supervivencia) resolvería el score pero ya no sería Pong clásico. Además, el modo a dos jugadores locales no aporta nada a un ranking individual. Es el único candidato de la categoría VERSUS, que hoy no tiene ningún motor real.

## Descartados

_(juego — motivo — fecha)_

## Ya en el catálogo con motor real

- `asteroid` — spec 05
- `tetris` — spec 08
- `arkanoid` — spec 09

## Notas de investigación

- **2026-08-11 — Estado del catálogo.** `lib/data.ts` tiene 8 entradas; 3 con motor real
  (`asteroid`, `tetris`, `arkanoid`) y 5 mocks sin motor: `serpentina`, `gloton`,
  `invasores`, `ranaria`, `duelo-pixel`. Todos los candidatos de este backlog son
  reemplazos de mocks: no hace falta inventar entradas nuevas todavía.
- **2026-08-11 — Huecos por categoría.** ARCADE: 1 de 4 con motor (`arkanoid`).
  PUZZLE: 1 de 1 (`tetris`, completo). SHOOTER: 1 de 2 (falta `invasores`).
  VERSUS: 0 de 1 — la única categoría sin ningún motor real, pero su único juego
  (Pong) es justamente el de peor encaje con el leaderboard.
- **2026-08-11 — Puntuación de Space Invaders (1978, Taito).** Confirmado: 10 pts las
  2 filas inferiores, 20 pts las 2 medias, 30 pts la superior → 990 pts por pantalla
  completa; el OVNI da 50/100/150/200/300 pts (en el original mediante una tabla de 16
  valores indexada por número de disparos, no aleatoria). Fuente:
  https://classicgaming.cc/classics/space-invaders/play-guide y
  https://spaceinvaders.fandom.com/wiki/UFO
- **2026-08-11 — Nombres y marcas.** El patrón del repo ha sido renombrar al título
  original en inglés (`rocas`→`asteroid`, `caida`→`tetris`, `bloque-buster`→`arkanoid`).
  Para Space Invaders (Taito), Pac-Man (Bandai Namco) y Frogger (Konami) ese patrón
  choca con marcas vivas; la recomendación es conservar los ids/títulos en español ya
  existentes (`invasores`, `gloton`, `ranaria`). Es una decisión del usuario, no del agente.
- **2026-08-11 — Referencias portables.** Confirmadas por specs: `references/started-games/02-asteroids/`
  (spec 05), `03-tetris/` (spec 08), `04-arkanoid/` (spec 09). No se pudo listar el
  directorio con las herramientas disponibles en esta sesión, así que **no está verificado**
  si existen carpetas adicionales (p. ej. una `01-*` o `05-*`) que sirvan de fuente para
  alguno de estos candidatos. Comprobarlo antes de correr `/add-game`: si existe una
  carpeta para el candidato elegido, invocar `/add-game <carpeta>` en vez de la
  descripción libre.
