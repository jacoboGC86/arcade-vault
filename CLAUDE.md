# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform to play games online and compete for high scores (Spanish-language UI). Built with Next.js 16.3.0 (App Router), React 19.2, TypeScript, and Tailwind CSS 4.

The scaffold has been ported into real App Router routes and components. The original static HTML/React prototype in `references/templates/` remains as the design/behavior spec — consult it when a screen's intended behavior is unclear, but the source of truth for actual code is now under `app/`, `components/`, and `lib/`:

- `app/page.tsx` — landing/home.
- `app/biblioteca/page.tsx` — game library/catalog (was `biblioteca.jsx`).
- `app/juegos/[id]/page.tsx` — game detail (was `detalle.jsx`).
- `app/jugar/[id]/page.tsx` — game player screen (was `reproductor.jsx`).
- `app/auth/page.tsx` — login (was `auth.jsx`).
- `app/salon/page.tsx` — hall of fame / leaderboard (was `salon.jsx`).
- `components/nav.tsx`, `components/game-card.tsx`, `components/game-player.tsx` — shared UI pieces.
- `lib/data.ts` — game/category data (ported from `data.jsx`), typed with `Game`, `GameCategory`, `GameColor`.
- `lib/session.tsx` — `SessionProvider`/`useSession` React context replacing the prototype's ad hoc `localStorage` user/scores handling (`av_user`, `av_scores` keys).

Reference-only files (do not edit as if they were live code):
- `references/templates/Arcade Vault.html` + `app.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `data.jsx` — original no-build-step prototype.
- `references/templates/styles.css` — the neon/pixel visual language (custom properties for color per game category); port any still-missing visual details to Tailwind when touching a screen.

When changing a screen, prefer reading the current `app/`/`components/` implementation first; fall back to the matching prototype file only to clarify original intent.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario

No test runner is configured yet.
