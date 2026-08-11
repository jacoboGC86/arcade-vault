# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform to play games online and compete for high scores (Spanish-language UI). Built with Next.js 16.3.0 (App Router), React 19.2, TypeScript, and Tailwind CSS 4.

The scaffold has been ported into real App Router routes and components. The original static HTML/React prototype in `references/templates/` remains as the design/behavior spec — consult it when a screen's intended behavior is unclear, but the source of truth for actual code is now under `app/`, `components/`, and `lib/`:

- `app/page.tsx` — landing/home, ported from `references/templates/home-about/home.jsx` (hero, features, games preview rail, stats, live activity, pricing/FAQ, final CTA). No longer redirects to `/biblioteca`. Still uses the static `GAMES` array from `lib/data.ts` for its games preview rail (`mini-card.tsx`) — not migrated to Supabase.
- `app/biblioteca/page.tsx` — game library/catalog (was `biblioteca.jsx`). Now an async Server Component that reads the catalog from Supabase via `getCatalogGames`/`getBestScores` (`lib/games/catalog.ts`) and hands the merged `CatalogGameWithBest[]` to `components/library-browser.tsx` for client-side search/filter.
- `app/juegos/[id]/page.tsx` — game detail (was `detalle.jsx`). Looks up the game via `getCatalogGame(id)` instead of the static `GAMES` array; scores/leaderboard queries unchanged (spec 07).
- `app/jugar/[id]/page.tsx` — game player screen (was `reproductor.jsx`). Also looks up the game via `getCatalogGame(id)`.
- `app/auth/page.tsx` — login (was `auth.jsx`).
- `app/salon/page.tsx` — hall of fame / leaderboard (was `salon.jsx`).
- `components/nav.tsx`, `components/game-card.tsx`, `components/game-player.tsx`, `components/mini-card.tsx` — shared UI pieces. `mini-card.tsx` is the simpler (no tilt) card used in the Home games rail, ported from `MiniCard` in `home.jsx` (still typed against `lib/data.ts`'s `Game`). `game-card.tsx` and `game-player.tsx` are now typed against `CatalogGame`/`CatalogGameWithBest` (`lib/games/catalog.ts`), not `lib/data.ts`'s `Game`.
- `components/library-browser.tsx` — client component holding `/biblioteca`'s search input, category chips, and grid (moved out of `app/biblioteca/page.tsx` so the page itself can be an async Server Component); receives `games: CatalogGameWithBest[]` as a prop.
- `lib/data.ts` — game/category data (ported from `data.jsx`), typed with `Game`, `GameCategory`, `GameColor`. Still the source for the Home games rail and for `CATS`/`PLAYERS`, but **no longer** the source of the catalog for `/biblioteca`, `/juegos/[id]`, or `/jugar/[id]` — those read from Supabase's `games` table instead (see `lib/games/catalog.ts`). Kept in sync manually; if you add/edit a game's title/description/cover/color here for the Home rail, mirror it into the `games` table too (or vice versa) to avoid drift.
- `lib/games/catalog.ts` — server-side data layer for the games catalog: `getCatalogGames()`, `getCatalogGame(id)`, `getBestScores()` (max score per `game_id` from `scores`, computed in JS). Exports `CatalogGame`/`CatalogGameWithBest` types. Filters out any `games` row with a null `short`/`long`/`cat`/`cover`/`color` (the `games` table columns beyond `id`/`title` are nullable — a row with incomplete catalog data simply won't appear/resolve, e.g. `notFound()` in detail/jugar, rather than crashing).
- `lib/session.tsx` — `SessionProvider`/`useSession` React context replacing the prototype's ad hoc `localStorage` user/scores handling (`av_user`, `av_scores` keys).
- `lib/games/engine.ts` — generic `GameEngine`/`GameEngineState`/`GameEngineFactory` contract (`start`/`stop`/`pause`/`resume`/`restart`/`forceGameOver` + `onStateChange`/`onGameOver` callbacks) that any real game engine implements to plug into the React HUD.
- `lib/games/asteroids.ts` — `createAsteroidsEngine`, a TypeScript port of `references/started-games/02-asteroids/` (ship, asteroids, bullets, particles, shield/triple-shot power-ups) as a closure with no module-level state, implementing `GameEngine`.
- `lib/games/tetris.ts` — `createTetrisEngine`, a TypeScript port of `references/started-games/03-tetris/` (10×20 board, 7 standard pieces with wall-kick rotation, soft/hard drop, line clears, levels, bomb piece, gravity power-up) as a closure with no module-level state, implementing `GameEngine` with extra `lines`/`bestCombo` state fields. Board and next-piece preview both render inside the single 800×600 canvas.
- `lib/games/registry.ts` — `GAME_ENGINES` map from game `id` to `GameEngineFactory` (`asteroid`, `tetris`); `components/game-player.tsx` looks up the game's `id` here and falls back to the existing simulated player for any `id` without a registered engine.
- `components/games/game-canvas.tsx` — client component that mounts the fixed 800×600 `<canvas>`, wires it to a `GameEngine` instance (mount/unmount lifecycle, keyboard focus handling, "CLIC PARA JUGAR" overlay), and exposes `pause`/`resume`/`restart`/`forceGameOver` to the parent via ref.

See `specs/05-motor-de-juegos-y-asteroides.md` for the full rationale behind the engine contract and the Asteroids port, `specs/08-motor-tetris.md` for the Tetris port (formerly the "CAÍDA" mock, `id: "caida"`, now `id: "tetris"`), and `specs/06-leaderboard-supabase.md`/`specs/07-leaderboard-detalle-juego.md` for the Supabase `scores`/leaderboard integration that the catalog migration builds on. The `games` table's catalog columns (`short`, `long`, `cat`, `cover`, `color`) and `lib/games/catalog.ts` were added later to migrate `/biblioteca`, `/juegos/[id]`, and `/jugar/[id]` off `lib/data.ts` — this migration doesn't have its own numbered spec doc yet.

`specs/` holds Spec Driven Design docs (see README) — check there for the status and rationale behind each screen before assuming behavior is undocumented.

Reference-only files (do not edit as if they were live code):
- `references/templates/Arcade Vault.html` + `app.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `data.jsx` — original no-build-step prototype.
- `references/templates/styles.css` — the neon/pixel visual language (custom properties for color per game category); port any still-missing visual details to Tailwind when touching a screen.
- `references/templates/home-about/home.jsx`, `nav.jsx`, `styles.css` — a separate reference bundle for the Home + "Acerca de" screens. `home.jsx` is fully ported into `app/page.tsx`; `about.jsx`'s contact form and the "Acerca de" nav link are not ported yet (no destination route exists). Its `styles.css` (1744 lines) is a distinct file from `references/templates/styles.css` (968 lines) — only the Home-specific rules have been copied into `app/globals.css`, so diff carefully before porting more of it.

When changing a screen, prefer reading the current `app/`/`components/` implementation first; fall back to the matching prototype file only to clarify original intent.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario

No test runner is configured yet.
