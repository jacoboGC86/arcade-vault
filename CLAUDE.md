# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform to play games online and compete for high scores (Spanish-language UI). Built with Next.js 16.3.0 (App Router), React 19.2, TypeScript, and Tailwind CSS 4.

The app is currently the unmodified `create-next-app` scaffold (`app/layout.tsx`, `app/page.tsx`). The actual product design/behavior lives as a static HTML/React reference prototype in `references/templates/` and is not yet wired into the Next.js app — treat it as the spec to implement against, not working code:

- `references/templates/Arcade Vault.html` — prototype shell that loads the `.jsx` files as plain scripts (no build step, uses global `React`/`ReactDOM`).
- `app.jsx` — root component and hash-based router (routes: `biblioteca`, `detalle`, `player`, `auth`, `salon`), persists `user`/`scores` to `localStorage`.
- `data.jsx` — mock data: `GAMES`, `CATS`, `PLAYERS`, and `seededScores()` for deterministic leaderboard rows.
- `nav.jsx`, `biblioteca.jsx` (library/catalog), `detalle.jsx` (game detail), `reproductor.jsx` (game player screen), `auth.jsx` (login), `salon.jsx` (hall of fame / leaderboard) — one file per screen/component, matching the routes in `app.jsx`.
- `styles.css` — the neon/pixel visual language (custom properties for color per game category) to port to Tailwind.

When implementing a screen, read the matching template file first and port its structure/behavior into the App Router (real routes/components), rather than inventing new UI patterns.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario

No test runner is configured yet.
