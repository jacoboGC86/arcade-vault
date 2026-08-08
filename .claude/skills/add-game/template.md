# Template for a game spec (`/add-game`)

This file is the reference the `/add-game` skill consults when generating a spec for a new or migrated game. It is a specialization of `.claude/skills/spec/template.md` for the "add a real game to the catalog" case — it follows the shape actually used in `specs/05-motor-de-juegos-y-asteroides.md` (engine port) and `specs/06-leaderboard-supabase.md` (catalog ↔ Supabase sync). **It is not text to copy verbatim** — it is the shape the skill must respect.

Read `.claude/skills/spec/template.md` first for the generic rules (one sentence per idea, no long executable code, boolean acceptance criteria, etc.). Everything there still applies. This file only adds/narrows what is specific to games.

---

## Header

Same as the generic template:

```markdown
# NN — Short, descriptive title (game name in the catalog's voice, e.g. "ASTEROID")

**Estado:** Draft
**Depende de:** —  (or [[NN-other-spec]] if it builds on one)
**Fecha:** YYYY-MM-DD
**Objetivo:** One sentence. Name the game, whether it replaces an existing catalog entry or adds a new one, and that it plugs into the existing `GameEngine` contract.
```

Match the exact state vocabulary already used in this repo's specs (`Draft`/`Implementado`/etc. — check the two most recent specs, same as `/spec` Phase 1 rule 3).

---

## Scope

Always include, explicitly, in **Incluido**:

- Whether an existing `lib/data.ts` entry is renamed/replaced (state the old `id`/`title`/`cover` → new ones, same as spec 05 did for `rocas` → `asteroid`) or a brand-new entry is added (state the new `id`, `title`, `cat`, `cover`, `color`).
- The new engine file `lib/games/<slug>.ts` exporting `create<Nombre>Engine`, implementing the existing `GameEngine` interface (`lib/games/engine.ts`) — **do not redesign this interface**, only note if the game needs no new fields beyond `score`/`lives`/`level` or if it needs additional state (see Data model).
- The new entry in `lib/games/registry.ts` (`GAME_ENGINES`).
- Whichever mechanics are in scope for this game specifically (movement, scoring rule, power-ups, win/lose condition) — concrete, not "core gameplay".
- If the catalog `id` is new or renamed: a migration step inserting/updating the corresponding row in the Supabase `games` table (see Data model / Implementation plan) — required so `scores.game_id`'s FK doesn't break when a score is saved for this game.

Always include, explicitly, in **Fuera de alcance**:

- Every other catalog game not touched by this spec keeps its current behavior (simulated mock, or its own real engine) unchanged — name them explicitly, same as spec 05 did.
- Anything the source material (README/game.js under `references/started-games/`, or the user's free-text description) mentions but that isn't being ported now (sound, mobile/gamepad controls, online multiplayer, etc.) — unless the user explicitly asked for it in Phase 2.
- Redesigning `GameEngine`, `GameEngineFactory`, `game-canvas.tsx`'s focus/overlay handling, or the leaderboard (`scores` table, `/salon`) — all already generic and reused as-is.

---

## Data model

Always show:

```ts
// lib/games/<slug>.ts — extends the existing contract, does not replace it
export interface <Nombre>EngineState extends GameEngineState {
  // only if the game needs fields beyond score/lives/level — otherwise omit this
  // and state explicitly: "reuses GameEngineState with no additional fields"
}
```

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Record<string, GameEngineFactory> = {
  // ...existing entries unchanged
  "<catalog-id>": create<Nombre>Engine,
};
```

If the catalog `id` is new or renamed, always also include the Supabase migration SQL for the `games` table (mirrors spec 06's seed block):

```sql
insert into public.games (id, title) values ('<catalog-id>', '<TITLE>')
on conflict (id) do update set title = excluded.title;
```

If replacing an existing `id` (rename), state explicitly whether the old row in `games` is updated in place (same `id`, new `title`) or a new row is inserted and the old one is deprecated — pick the one that matches what's happening in `lib/data.ts` in this same spec.

If the game introduces no other new data structures beyond the engine state, say so explicitly (per the generic template's rule).

---

## Implementation plan

Numbered steps, each leaving the project compiling — same shape as spec 05's plan. Typical skeleton (adapt, don't pad):

1. Catalog change in `lib/data.ts` (rename or new entry) + matching CSS class in `app/globals.css` if the cover art class changes, + any copy referencing the old name elsewhere (e.g. `app/page.tsx`'s live-activity row, if applicable).
2. `lib/games/<slug>.ts`: port/implement `create<Nombre>Engine(canvas): GameEngine` as a closure with no module-level state (same constraint as spec 05 — supports mount/unmount without state leaking between games or React Strict Mode remounts). If migrating from `references/started-games/`, name the exact source file(s) being ported and note any behavior deliberately dropped (in-canvas HUD, auto-restart-on-Space, standalone sound) — same pattern as spec 05 §Plan step 3.
3. `lib/games/registry.ts`: add the new `GAME_ENGINES` entry.
4. Only if the game needs something `game-canvas.tsx`/`game-player.tsx` don't already support generically (e.g. a second canvas for a "next piece" preview, extra HUD fields) — describe the minimal addition. Otherwise state explicitly that no changes are needed there, since the existing integration (`components/game-player.tsx` resolving `GAME_ENGINES[game.id]`) already covers it.
5. If the catalog `id` is new/renamed: apply the `games` table migration (`mcp__supabase__apply_migration`), confirm with `mcp__supabase__list_tables`.
6. Manual verification step in `npm run dev`: play the game end-to-end at `/jugar/<id>` (movement, scoring, win/lose, power-ups if any, pause/resume, game over modal, save score), and confirm at least one untouched game (`/jugar/<other-id>`) still behaves as before.
7. `npm run build` with no TypeScript errors.

---

## Acceptance criteria

Boolean checklist, same rules as the generic template (no "it works well"). Always include:

- [ ] Catalog entry in `lib/data.ts` matches what Scope/Data model describe (id/title/cover/color/cat).
- [ ] `lib/games/<slug>.ts` exports `create<Nombre>Engine` with no module-level state.
- [ ] `lib/games/registry.ts` maps `"<catalog-id>"` to `create<Nombre>Engine`.
- One checklist item per concrete mechanic named in Scope (movement, scoring formula, power-ups, win/lose condition) — verifiable, not aspirational.
- [ ] HUD (`player-hud`) reflects real score/lives/level (and any extra state) live.
- [ ] PAUSA/REANUDAR/FIN and the game-over modal behave like spec 05's engine-connected flow (freeze exactly, `forceGameOver()` shows the modal with the real score, `restart()` fully resets state).
- [ ] "GUARDAR PUNTUACIÓN" calls `saveScore({ game: "<catalog-id>", score, name })` and a row appears in Supabase `scores` (verifiable via query), per spec 06's flow.
- [ ] If the `games` row was new/renamed: the insert/update landed in Supabase (verifiable via `mcp__supabase__list_tables` or a query).
- [ ] Every other catalog game named in Scope's "fuera de alcance" still shows its previous behavior unchanged.
- [ ] `npm run build` compiles with no TypeScript errors.

---

## Decisiones tomadas y descartadas

Always address, when applicable (same "why" discipline as the generic template):

- Why the catalog `id` was chosen (language, matches a prototype folder name, etc.) — same kind of note as spec 05's justification for `"asteroid"` in English.
- Why an existing entry was renamed/replaced vs. a new one added — state the detection reasoning (e.g. "`caida`'s short/long description already describes Tetris mechanics, so this spec renames it instead of adding a duplicate entry") or, if the user overrode the automatic suggestion, say so.
- Any mechanic present in the source material (`references/started-games/`) that was deliberately dropped and why (mirrors spec 05's decisions about dropping the in-canvas HUD and Space-to-restart).

---

## Riesgos identificados

Only if non-obvious. Common ones worth checking for games specifically:

- Collision/order-of-checks fidelity when porting from a reference `game.js` (mirrors spec 05's first risk).
- `games` table / `lib/data.ts` sync drifting apart in the future (mirrors spec 06's first risk) — only needed if this spec doesn't fully close that loop.
- Anything about focus/keyboard handling specific to this game's control scheme (e.g. held keys, key combos) if it differs from Asteroids' simple arrows+space.

For small/contained specs, omit this section (per the generic template's rule).
