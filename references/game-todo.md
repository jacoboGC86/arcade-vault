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

## Descartados

_(juego — motivo — fecha)_

## Ya en el catálogo con motor real

- `asteroid` — spec 05
- `tetris` — spec 08
- `arkanoid` — spec 09

## Notas de investigación

_(el agente añade aquí hallazgos de la web que no caben en la tabla)_
