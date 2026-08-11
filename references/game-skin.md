# Skins de juegos — Arcade Vault

Memoria de `skin-designer` (`.claude/agents/skin-designer.md`). Registra qué motores tienen paleta
tematizada, dónde vive y con qué identidad visual.

## Tematizados

| Juego (game-id) | Motor | Paleta | Fecha | Notas |
| --- | --- | --- | --- | --- |
| tetris | `lib/games/tetris.ts` | `lib/games/themes/tetris-theme.ts` | 2026-08-11 | spec 10, referencia del patrón |
| arkanoid | `lib/games/arkanoid.ts` | `lib/games/themes/arkanoid-theme.ts` | 2026-08-11 | primer motor tematizado por el agente |
| asteroid | `lib/games/asteroids.ts` | `lib/games/themes/asteroid-theme.ts` | 2026-08-11 | id `asteroid`, archivo del motor `asteroids.ts` |

### asteroid

- **Elementos tematizados:** fondo, casco de la nave, llama del propulsor, asteroides, balas,
  partículas de explosión (color base; el alpha por vida se sigue calculando en el motor), aura
  circular del escudo + su anillo de pulso, hexágono del ítem de escudo, aura rómbica del disparo
  triple y su diamante. Más `shapeStyle` (`stroke`/`fill`/`fill-outline` + `shapeOutline`) y `glow`.
- **CLÁSICO:** Game Boy sobre `#0f1b0f`, siluetas **rellenas** (`shapeStyle: "fill"`) en vez de
  vectores huecos; nave `#9bbc0f` (lo más brillante), asteroides y partículas `#8bac0f`, auras en
  verdes claros diferenciadas solo por forma (círculo escudo / rombo triple), `glow: 0`.
- **NEON:** reproduce el render previo — fondo negro, todo blanco en contorno (`shapeStyle: "stroke"`),
  propulsor `rgba(255, 130, 0, 0.85)`, escudo `#00dcff`, disparo triple `#ff0000`.
- **PIXEL:** NES sobre `#101828`, siluetas rellenas con borde duro `rgba(0,0,0,0.55)`
  (`shapeStyle: "fill-outline"`); nave azul `#3cbcfc`, asteroides arena `#fcd8a8`, propulsor `#fc9838`,
  escudo verde `#58d854`, disparo triple rojo `#d82800`, `glow: 0`.
- **Pendiente / limitaciones:** el motor **no** tenía ningún `shadowBlur`, así que `glow` queda a `0`
  en los tres temas para no introducir una regresión en NEON; el campo está cableado (`applyGlow`) y
  listo si algún día se quiere un NEON con brillo. Los alphas dinámicos (partículas, parpadeo de
  ítems, pulso del escudo) se quedan en el motor: la paleta solo aporta el hex base, que se compone
  con el helper `withAlpha`. Velocidades, radios, `lineWidth` y colisiones intactos.

### arkanoid

- **Elementos tematizados:** fondo del canvas, pala, bola, los 7 colores de fila de bloques
  (`BLOCK_ROW_COLORS` desapareció como constante de módulo y pasó a `palette.blockRows`), el
  multiplicador `glow` sobre los tres `shadowBlur` (12 pala / 10 bola / 6 bloques) y el estilo de
  trazo de bloque (`blockStyle`: `glow` / `flat` / `outline` + `blockOutline`).
- **CLÁSICO:** Game Boy monocromo sobre `#0f1b0f`; pala `#8bac0f`, bola `#9bbc0f` (el elemento más
  brillante para que se siga), filas alternando los tres verdes legibles (`#9bbc0f`/`#8bac0f`/`#306230`,
  se descartó `#0f380f` por fundirse con el fondo), `glow: 0`, bloques planos separados solo por el
  gap de 2 px.
- **NEON:** reproduce el render previo píxel a píxel — fondo negro, pala `#00e5ff`, bola blanca y las
  7 literales originales de fila, con `glow: 1` (mismos `shadowBlur` que antes) y `blockStyle: "glow"`.
- **PIXEL:** NES sobre azul noche `#101828`; pala `#3cbcfc`, bola `#fcfcfc`, filas de gama NES plana
  (`#d82800`, `#fc9838`, `#fcd8a8`, `#00a800`, `#3cbcfc`, `#0058f8`, `#7c20a0`), `glow: 0` y borde
  duro `rgba(0,0,0,0.55)` de 2 px en cada bloque.
- **Pendiente / limitaciones:** el `Block` guardaba el color resuelto en la creación; ahora guarda
  `colorIndex` (fila ya rotada por nivel) y el color se resuelve en el `draw`, condición necesaria
  para que `setTheme` afecte a bloques ya creados. Grosores, geometría y velocidades intactos.

## Sin tematizar

| Juego (game-id) | Motor | Por qué aún no |
| --- | --- | --- |
| _(ninguno)_ | — | Los tres motores de `GAME_ENGINES` (`tetris`, `arkanoid`, `asteroid`) ya están tematizados |

## Notas de diseño

- Fondos por tema, heredados de `tetris-theme.ts`: `clasico` `#0f1b0f`, `neon` `#000000`,
  `pixel` `#101828`. Mantener salvo razón explícita.
- `glow` es siempre un multiplicador de los `shadowBlur` que el motor ya usaba: `1` en NEON (render
  idéntico al previo) y `0` en CLÁSICO y PIXEL.
- NEON es la línea base de no-regresión: copia literal de los colores pre-tematización.
- CLÁSICO acepta que varios elementos compartan tono (forma y contraste sostienen la legibilidad);
  PIXEL sustituye el brillo por bordes duros.
- Las paletas son específicas por juego: nada de tokens compartidos artificiales entre motores.
- Los juegos sin motor real en `GAME_ENGINES` no se tematizan.
- Si un motor no usaba `shadowBlur` (caso Asteroids), `glow` se queda a `0` en los tres temas: NEON
  manda sobre la coherencia, y añadir brillo sería regresión. El campo se cablea igualmente.
- Patrón para alphas dinámicos: la paleta guarda el hex base y el motor lo compone con un helper
  local `withAlpha(hex, alpha)`; nunca se mete el alpha calculado en la paleta.
- Segundo patrón de "estilo de trazo por tema", tras `cellStyle` de Tetris y `blockStyle` de Arkanoid:
  `shapeStyle` de Asteroids (`stroke`/`fill`/`fill-outline`) — siempre enum de strings, nunca flags.
