## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

Specs implementadas en `specs/`:
- `01-mvp-pantallas-visuales.md` — pantallas base (biblioteca, detalle, reproductor, auth, salón).
- `02-pagina-inicio.md` — página de inicio (`/`) real, reemplazando el redirect a `/biblioteca`.
- `03-pagina-about.md` — página "Acerca de".
- `04-integracion-supabase.md` — integración de Supabase.
- `05-motor-de-juegos-y-asteroides.md` — motor de juegos reutilizable (`GameEngine`) y puerto real de Asteroids ("ASTEROID") a `<canvas>`.
- `06-leaderboard-supabase.md` — leaderboard genérico con Supabase (guardar/consultar scores).
- `07-leaderboard-detalle-juego.md` — leaderboard por juego en la pantalla de detalle.
- `08-motor-tetris.md` — renombre de "CAÍDA" a "TETRIS" y puerto real del motor de Tetris a `<canvas>`.
- `09-motor-arkanoid.md` — renombre de "Bloque Buster" a "Arkanoid" y puerto real del motor de Arkanoid.

Además, sin spec numerada propia: el catálogo de juegos (título, descripción, categoría, cover, color) de `/biblioteca`, `/juegos/[id]` y `/jugar/[id]` ahora se lee de la tabla `games` de Supabase (vía `lib/games/catalog.ts`) en vez de `lib/data.ts`. La insignia "MEJOR PUNTUACIÓN" de la biblioteca también se calcula desde `scores` (máximo real), como ya hacía el detalle desde la spec 07.

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

Además, la skill local `add-game` (`.claude/skills/add-game/`) diseña el spec para incorporar un juego nuevo o migrado al catálogo (motor real, entrada de catálogo, fila en `games` de Supabase) antes de implementarlo con `/spec-impl`.

## Email

El formulario de contacto de `/about` envía correo con [Resend](https://resend.com) (`app/api/contact/route.ts`). Configura estas variables de entorno:

```bash
RESEND_API_KEY=
CONTACT_FROM_EMAIL=
CONTACT_TO_EMAIL=
```

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
```

## Hola mundo! XD