# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform to play games online and compete for high scores (Spanish-language UI). Built with Next.js 16.3.0 (App Router), React 19.2, TypeScript, and Tailwind CSS 4.

The scaffold has been ported into real App Router routes and components. The original static HTML/React prototype in `references/templates/` remains as the design/behavior spec — consult it when a screen's intended behavior is unclear, but the source of truth for actual code is now under `app/`, `components/`, and `lib/`:

- `app/page.tsx` — landing/home, ported from `references/templates/home-about/home.jsx` (hero, features, games preview rail, stats, live activity, pricing/FAQ, final CTA). No longer redirects to `/biblioteca`.
- `app/biblioteca/page.tsx` — game library/catalog (was `biblioteca.jsx`).
- `app/juegos/[id]/page.tsx` — game detail (was `detalle.jsx`).
- `app/jugar/[id]/page.tsx` — game player screen (was `reproductor.jsx`).
- `app/auth/page.tsx` — login (was `auth.jsx`).
- `app/salon/page.tsx` — hall of fame / leaderboard (was `salon.jsx`).
- `components/nav.tsx`, `components/game-card.tsx`, `components/game-player.tsx`, `components/mini-card.tsx` — shared UI pieces. `mini-card.tsx` is the simpler (no tilt) card used in the Home games rail, ported from `MiniCard` in `home.jsx`.
- `lib/data.ts` — game/category data (ported from `data.jsx`), typed with `Game`, `GameCategory`, `GameColor`.
- `lib/session.tsx` — `SessionProvider`/`useSession` React context replacing the prototype's ad hoc `localStorage` user/scores handling (`av_user`, `av_scores` keys).
- `lib/games/engine.ts` — generic `GameEngine`/`GameEngineState`/`GameEngineFactory` contract (`start`/`stop`/`pause`/`resume`/`restart`/`forceGameOver` + `onStateChange`/`onGameOver` callbacks) that any real game engine implements to plug into the React HUD.
- `lib/games/asteroids.ts` — `createAsteroidsEngine`, a TypeScript port of `references/started-games/02-asteroids/` (ship, asteroids, bullets, particles, shield/triple-shot power-ups) as a closure with no module-level state, implementing `GameEngine`.
- `lib/games/registry.ts` — `GAME_ENGINES` map from game `id` to `GameEngineFactory` (currently only `asteroid`); `components/game-player.tsx` looks up the game's `id` here and falls back to the existing simulated player for any `id` without a registered engine.
- `components/games/game-canvas.tsx` — client component that mounts the fixed 800×600 `<canvas>`, wires it to a `GameEngine` instance (mount/unmount lifecycle, keyboard focus handling, "CLIC PARA JUGAR" overlay), and exposes `pause`/`resume`/`restart`/`forceGameOver` to the parent via ref.

See `specs/05-motor-de-juegos-y-asteroides.md` for the full rationale behind the engine contract and the Asteroids port.

`specs/` holds Spec Driven Design docs (see README) — check there for the status and rationale behind each screen before assuming behavior is undocumented.

Reference-only files (do not edit as if they were live code):
- `references/templates/Arcade Vault.html` + `app.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `data.jsx` — original no-build-step prototype.
- `references/templates/styles.css` — the neon/pixel visual language (custom properties for color per game category); port any still-missing visual details to Tailwind when touching a screen.
- `references/templates/home-about/home.jsx`, `nav.jsx`, `styles.css` — a separate reference bundle for the Home + "Acerca de" screens. `home.jsx` is fully ported into `app/page.tsx`; `about.jsx`'s contact form and the "Acerca de" nav link are not ported yet (no destination route exists). Its `styles.css` (1744 lines) is a distinct file from `references/templates/styles.css` (968 lines) — only the Home-specific rules have been copied into `app/globals.css`, so diff carefully before porting more of it.

When changing a screen, prefer reading the current `app/`/`components/` implementation first; fall back to the matching prototype file only to clarify original intent.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario

No test runner is configured yet.
