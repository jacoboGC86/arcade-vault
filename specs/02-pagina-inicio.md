# 02 — Página de inicio (Home)

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-08-06

**Objetivo:** Portar la landing page del prototipo (`references/templates/home-about/home.jsx`) a `app/page.tsx`, reemplazando el redirect actual a `/biblioteca` por una Home real con hero, features, preview de juegos, stats, actividad en vivo, precios y CTA final.

## Alcance

**Incluido:**
- `app/page.tsx` deja de redirigir a `/biblioteca` y pasa a renderizar la Home portada de `home.jsx`: hero con siluetas flotantes animadas, sección "¿Por qué Arcade Vault?" (feature grid), rail de preview de juegos, banda de stats, "Actividad en vivo" (últimas puntuaciones + top jugadores), sección de precios con FAQ, y CTA final.
- Efecto scroll-reveal (`useReveal`, `IntersectionObserver` sobre `.reveal`) portado igual que en el template.
- `components/mini-card.tsx` nuevo: puerto de `MiniCard` (cover + título + categoría, sin tilt 3D), usado en el rail "Juegos disponibles ahora"; recibe `game: Game` y navega a `/juegos/[id]`.
- `components/nav.tsx`: se agrega el link "Inicio" (→ `/`) antes de "Biblioteca", tanto en el nav de escritorio como en el panel móvil. Se resalta activo solo en `/` exacto.
- Datos de "Actividad en vivo" (últimas puntuaciones y top jugadores del día) copiados tal cual del template como constantes locales — no se derivan de `seededScores`/`PLAYERS`.
- CSS: se portan a `app/globals.css` únicamente las reglas que la Home consume, tomadas de `references/templates/home-about/styles.css` — clases `home-*`, `mini-card`/`mini-cover`/`mini-meta`/`mini-title`/`mini-cat`/`mini-rail`, `feature-grid`/`feature-card`/`ft-*`, `stat-block`/`stat-n`/`stat-u`/`stat-s`, `activity-grid`/`activity-card`/`ac-*`/`ticker`/`tick-row`/`tk-*`/`top-list`/`top-row`/`tp-*`, `pricing-grid`/`price-card`/`pc-*`/`pricing-faq`/`faq-*`, y los estilos de `.home-silos`/`.silo` (siluetas SVG decorativas).
- Iconos pixel-art inline (`FeatureIcon`) portados igual que el template (SVGs construidos con `<rect>`).
- Botones de la Home navegan con `useRouter().push` a rutas reales ya existentes: "Explorar juegos" y "Ver todos los juegos" → `/biblioteca`; "Crear cuenta" y "Empezar gratis" → `/auth`; "Ver salón" → `/salon`; cards del rail → `/juegos/[id]`.

**Explícitamente fuera de alcance:**
- La página "Acerca de" (`about.jsx`) y su formulario de contacto — spec aparte.
- El link "Acerca de" en el Nav — no se agrega porque su destino no existe todavía.
- Conectar los datos de "Actividad en vivo" a un backend real o a `seededScores`/`PLAYERS` — quedan como mock estático, igual que el template.
- Cualquier cambio a `/biblioteca`, `/juegos/[id]`, `/jugar/[id]`, `/auth` o `/salon` más allá de ser destinos de los CTAs de Home.
- Tests automatizados (no hay test runner configurado).

## Modelo de datos

No se introducen tipos ni módulos de datos nuevos en `lib/`. Los datos de "Actividad en vivo" (últimas puntuaciones y top jugadores) viven como constantes locales dentro de `app/page.tsx`, con la misma forma que en el template:

```ts
interface ActivityRow { p: string; g: string; s: number; t: string; c: "cyan" | "magenta" | "yellow" | "green" }
interface TopRow { r: number; p: string; s: number }
```

`app/page.tsx` reutiliza `GAMES` de `lib/data.ts` (`GAMES.slice(0, 6)`) para el rail de preview — sin cambios al módulo.

## Plan de implementación

1. **`components/mini-card.tsx`**: crear componente cliente, puerto de `MiniCard` de `home.jsx`. Props `{ game: Game }`, usa `useRouter().push(`/juegos/${game.id}`)` en el click del contenedor.
2. **CSS**: copiar a `app/globals.css` las reglas listadas en el alcance, tomadas de `references/templates/home-about/styles.css`, verificando que no dupliquen ni choquen con clases ya existentes (`.btn`, `.card`, `.chip`, `.cover-*`, variables de color).
3. **`app/page.tsx`**: reemplazar el `redirect("/biblioteca")` actual por el componente Home completo (`"use client"`), portando de `home.jsx`: `FloatingSilhouettes`, `FeatureIcon`, hook `useReveal`, y las 7 secciones (hero, why, games preview, stats, actividad en vivo, pricing, CTA final). Los `onClick` de navegación pasan de `navigate({ name })` del router del prototipo a `useRouter().push(href)`.
4. **`components/nav.tsx`**: agregar el link "Inicio" → `/` antes de "Biblioteca" en `.links` (desktop) y en `.av-mobile-panel` (móvil). Ajustar `isActive` para que "Inicio" solo se marque activo en `pathname === "/"`.
5. Revisar responsive de la Home (breakpoints ya definidos en `globals.css`) y confirmar que las siluetas decorativas y el ticker de actividad no rompen el layout en móvil.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [x] `/` renderiza la Home (hero, why, preview de juegos, stats, actividad en vivo, precios, CTA final) en vez de redirigir a `/biblioteca`.
- [x] El hero muestra las siluetas flotantes animadas y los botones "Explorar juegos" (→ `/biblioteca`) y "Crear cuenta" (→ `/auth`).
- [x] La sección "¿Por qué Arcade Vault?" muestra las 4 feature cards con su ícono, título y descripción, con animación de entrada al hacer scroll (`.reveal`/`.in`).
- [x] El rail "Juegos disponibles ahora" muestra 6 `MiniCard` (de `GAMES`), cada una navega a `/juegos/[id]` al hacer click; el botón "Ver todos los juegos" navega a `/biblioteca`.
- [x] La banda de stats muestra los 3 bloques con animación de entrada al hacer scroll.
- [x] "Actividad en vivo" muestra el ticker de últimas puntuaciones y el top 5 de jugadores del día; el botón "Ver salón" navega a `/salon`.
- [x] La sección de precios muestra el plan único con su lista de beneficios y el FAQ de 3 preguntas; el botón "Empezar gratis" navega a `/auth`.
- [x] El CTA final navega a `/biblioteca` al hacer click.
- [x] El link "Inicio" aparece primero en el Nav (desktop y móvil), navega a `/`, y se resalta activo solo cuando `pathname === "/"`.
- [x] `npm run build` compila sin errores de TypeScript ni de rutas.

## Decisiones tomadas y descartadas

- **`/` como Home real**: se descarta mantener el redirect de la spec 01 (`/` → `/biblioteca`) porque el objetivo de este spec es que `/` sea la landing real, igual que en `app.jsx` del prototipo donde `home` es la ruta raíz.
- **Alcance sin "Acerca de"**: aunque el `nav.jsx` de referencia (`home-about/nav.jsx`) incluye un link "Acerca de", se deja fuera de este spec porque `about.jsx` no se ha portado — evita un link roto o una página vacía.
- **Datos de actividad como mock local**: se mantienen los arrays hardcodeados del template en vez de derivarlos de `seededScores`/`PLAYERS` de `lib/data.ts`, para no inventar una relación entre ambos conjuntos de datos que el template nunca definió.
- **`MiniCard` como componente nuevo**: no se reutiliza `GameCard` (que tiene efecto tilt 3D) porque `MiniCard` es visualmente más simple y así lo define el template; forzar una prop de variante en `GameCard` añadiría complejidad no solicitada.
- **CSS portado selectivamente**: se copian solo las reglas nuevas usadas por Home desde `home-about/styles.css` a `app/globals.css`, en vez de reemplazar el archivo completo, para no arriesgar romper las pantallas ya implementadas en spec 01 con un archivo de referencia distinto (1744 vs 968 líneas).
- **`app/page.tsx` como Client Component**: igual patrón que `biblioteca`/`detalle`/`reproductor` de spec 01 — necesita `"use client"` para el `IntersectionObserver` del scroll-reveal y los `onClick` de navegación.

## Riesgos identificados

- El CSS portado desde `home-about/styles.css` puede definir variables o clases con el mismo nombre que `app/globals.css` pero valores distintos (es un archivo de referencia separado, no una versión incremental de `references/templates/styles.css`); revisar solapes antes de pegar bloques completos.
- El `IntersectionObserver` de `useReveal` debe inicializarse solo en cliente y limpiar el observer al desmontar, igual que en el template, para evitar fugas de memoria al navegar entre rutas con Next.js App Router.
