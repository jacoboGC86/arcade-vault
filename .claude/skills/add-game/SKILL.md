---
name: add-game
description: Designs a spec for a new or migrated game (real GameEngine, catalog entry, Supabase games row) following the spec-driven method. Detects whether $ARGUMENTS points at a references/started-games/ folder (migration) or is a free-text description (new game). Asks clarifying questions, then writes the spec. Use it before porting/creating any real game.
disable-model-invocation: true
argument-hint: '<descripción del juego o carpeta de references/started-games, ej. "03-tetris" o "juego de plataformas...">'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Diseñador de specs para juegos nuevos o migrados

## Session context

Fecha de hoy (úsala para el header del spec, nunca la adivines):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ todavía no existe"`

Juegos de referencia disponibles para migrar:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ no existe"`

---

Esta skill produce un spec listo para `/spec-impl` que incorpora un juego real al catálogo: motor (`GameEngine`), entrada de `lib/data.ts`, y — si aplica — fila en la tabla `games` de Supabase. **No escribe código.** Sigue el mismo método de 4 fases que `.claude/skills/spec/SKILL.md`, pero con un Phase 1 y un template especializados en juegos.

Lee `.claude/skills/add-game/template.md` (en el mismo directorio que esta skill) para la forma exacta que debe tener el spec de salida — es la especialización de `.claude/skills/spec/template.md` para este caso, basada en `specs/05-motor-de-juegos-y-asteroides.md` y `specs/06-leaderboard-supabase.md`.

## Filosofía

Igual que `/spec`: el spec es el contrato que dirige la implementación. Aquí además hay una arquitectura ya construida que **no se debe rediseñar** — `GameEngine`/`GameEngineState`/`GameEngineFactory` (`lib/games/engine.ts`), el registro `GAME_ENGINES` (`lib/games/registry.ts`), y el leaderboard genérico por `game_id` (tabla `scores`). El trabajo de esta skill es encajar el juego nuevo en esos contratos, no reinventarlos.

## Flujo del comando

Sigue las cuatro fases en orden. Tus respuestas deben estar en el mismo idioma que el prompt inicial del usuario.

### Fase 1 — Entender el contexto y detectar el flujo

1. Lee el archivo de memoria del proyecto si existe: prueba en orden `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`, y quédate con el primero que encuentres.
2. Lee `lib/games/engine.ts` (contrato `GameEngine`), `lib/games/registry.ts` (juegos ya con motor real) y `lib/data.ts` (catálogo completo: id/title/short/long/cat/cover/color de cada juego). Necesitas esto para no reinventar el contrato y para poder detectar coincidencias de catálogo en el paso 4.
3. Si existen specs previos, lee al menos `specs/05-motor-de-juegos-y-asteroides.md` y `specs/06-leaderboard-supabase.md` (o los que ocupen ese rol en este repo) para el tono, el idioma exacto y la estructura real que ya usa el proyecto — el template es la guía, pero estos specs son la fuente de verdad de cómo se ven en este repo.
4. **Detecta el flujo según `$ARGUMENTS`:**
   - Si `$ARGUMENTS` coincide (exacto, o por número/slug parcial, igual que `/spec-impl` resuelve el nombre de un spec) con una carpeta listada en "Juegos de referencia disponibles para migrar" arriba → **flujo migración**. Lee todos los `.js` de esa carpeta (`game.js` y cualquier módulo auxiliar como `shield.js`/`triple-shot.js`) y su `README.md` — son la fuente de verdad de mecánicas, controles, puntuación y estructura de niveles. No le preguntes al usuario nada que ya esté respondido ahí.
   - Si no coincide con ninguna carpeta → **flujo descripción libre**. El texto de `$ARGUMENTS` es la única fuente de las mecánicas; todo lo que no especifique se pregunta en Fase 2. No inventes mecánicas que el usuario no pidió.
   - Si `$ARGUMENTS` viene vacío, pregunta primero si el usuario quiere migrar un juego de `references/started-games/` (lista las carpetas disponibles) o describir uno nuevo desde cero.
5. **Detecta automáticamente si el juego reemplaza una entrada existente del catálogo.** Compara la descripción del juego (del README/game.js migrado, o de la descripción libre) contra `short`/`long`/`cat` de cada entrada de `lib/data.ts`. Si hay una coincidencia clara de mecánica (p. ej. una entrada cuya descripción ya narra "encajar piezas que caen" y estás migrando Tetris), **asume el reemplazo sin preguntar** — mismo patrón que `rocas` → `asteroid` en el spec 05. Si no hay ninguna coincidencia razonable, trata el juego como una entrada nueva del catálogo (se define id/color/categoría en Fase 2). Registra la decisión (y su razón) para la sección "Decisiones" del spec.

### Fase 2 — Aclarar mediante preguntas

Igual que `/spec`: bloques de 3 a 5 preguntas, usando `AskUserQuestion` con tu recomendación marcada primero. No preguntes nada que ya hayas resuelto leyendo el `game.js`/README en el flujo de migración.

**Categorías a cubrir siempre:**

- **Catálogo:** si Fase 1 detectó un reemplazo automático, confírmaselo al usuario como una afirmación ("Voy a reemplazar `caida` por este juego, misma lógica que `rocas`→`asteroid`") en vez de preguntarlo — pero si hay ambigüedad real (dos entradas podrían encajar, o ninguna encaja con claridad), sí pregunta. Si es entrada nueva: id (slug, probablemente en español salvo que el usuario pida lo contrario), título, categoría (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), color (`cyan`/`magenta`/`yellow`/`green`), y el texto `short`/`long`.
- **Estado del motor:** ¿el juego necesita campos en `GameEngineState` más allá de `score`/`lives`/`level` (p. ej. líneas eliminadas, combo, munición)? ¿o le basta el contrato genérico?
- **Controles:** teclas exactas y qué hace cada una (mismo detalle que el spec 05 documentó para Asteroids).
- **Mecánicas especiales:** power-ups, niveles, fórmula de puntuación exacta, condición de victoria/derrota.
- **Fuera de alcance:** cualquier cosa que el README/game.js migrado traiga pero que no se vaya a portar (sonido, gamepad, multijugador) — confirma explícitamente que queda fuera, no lo asumas.

**Cuándo dejar de preguntar:** cuando puedas responder sin asumir nada: (1) qué entrada de `lib/data.ts` se crea o reemplaza y con qué valores, (2) qué archivo nuevo se crea (`lib/games/<slug>.ts`) y qué mecánicas exactas implementa, (3) si hace falta un insert/update en la tabla `games` de Supabase y con qué valores, (4) cómo se verifica manualmente que el juego funciona.

### Fase 3 — Escribir el spec

Mismo criterio que `/spec`: si ya tienes todo de las Fases 1-2 sin asumir nada, escribe el spec completo de una vez (no sección por sección) y pasa a Fase 4. Solo ve sección por sección si algo sigue sin resolverse.

Sigue exactamente la estructura de `.claude/skills/add-game/template.md`: Header, Alcance, Modelo de datos, Plan de implementación, Criterios de aceptación, Decisiones tomadas y descartadas, Riesgos (si aplica).

### Fase 4 — Guardar el spec

Idéntico al Phase 4 de `.claude/skills/spec/SKILL.md`:

1. Número siguiente en `specs/` (el más alto + 1, con cero a la izquierda).
2. Slug kebab-case corto derivado del objetivo (p. ej. `motor-tetris` o `serpentina-real`).
3. Fecha tomada del contexto de sesión de arriba, nunca inventada.
4. Escribe directamente `specs/NN-slug.md`. No pidas permiso para el nombre del archivo — anuncia la ruta en la confirmación final. Solo pregunta si el archivo destino ya existe.
5. Estado `Draft` (o el equivalente que ya use este repo) por defecto. Nunca lo marques como `Aprobado`/`Approved` automáticamente.
6. Si el header lista dependencias, comprueba que el spec referenciado exista en `specs/`.
7. Respeta `specs/.spec-config.yml` si existe (no lo toques ni lo recrees — esa responsabilidad es de `/spec`).
8. Confirma al usuario: ruta del archivo creado, recordatorio de que está en `Draft`, y que el siguiente paso es correr `/spec-impl NN-slug` una vez aprobado. **Detente ahí** — no propongas implementar, no escribas código.

## Reglas duras

- **Nunca escribas código en esta skill.** Solo el `.md` del spec al final.
- **Nunca rediseñes `GameEngine`/`GameEngineFactory`/`GameEngineState`, `game-canvas.tsx`, ni el leaderboard genérico (`scores`).** El spec generado los reutiliza, no los reemplaza — si el juego parece necesitar algo que el contrato actual no soporta, dilo como riesgo/decisión abierta en el spec, no lo resuelvas inventando una nueva interfaz.
- **En el flujo de migración, no inventes mecánicas que no estén en el `game.js`/README fuente** — pregunta si algo no queda claro leyendo el código.
- **En el flujo de descripción libre, no inventes mecánicas que el usuario no pidió** — si la descripción es ambigua sobre algo importante (puntuación, condición de derrota), pregúntalo en Fase 2 en vez de asumir.
- **La detección automática de reemplazo de catálogo es una propuesta, no una decisión silenciosa** — siempre queda registrada explícitamente en el spec (sección Decisiones) y, si hay ambigüedad real, se confirma con el usuario en Fase 2.
- **Nunca implementes el spec ni propongas hacerlo tras guardarlo.** Ese es el trabajo de `/spec-impl`, sin cambios.

## Arguments

`$ARGUMENTS` puede ser (a) el nombre exacto o parcial de una carpeta de `references/started-games/` (ej. `03-tetris`, `tetris`), o (b) una descripción libre en texto del juego a crear. La Fase 1 decide cuál es comparando contra el listado de carpetas del contexto de sesión de arriba. Si viene vacío, pregunta cuál de los dos casos aplica antes de continuar.
