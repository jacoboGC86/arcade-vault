# 01 — MVP: pantallas visuales de Arcade Vault

**Estado:** Aprobado
**Depende de:** —
**Fecha:** 2026-08-06

**Objetivo:** Portar las 5 pantallas del prototipo estático (`references/templates/`) a rutas reales de Next.js App Router, con toda la interactividad visual (routing, filtros, tabs, formularios, simulación de partida) pero sin implementar ningún juego jugable de verdad.

## Alcance

**Incluido:**
- 5 pantallas como rutas reales de App Router: Biblioteca (`/biblioteca`), Detalle de juego (`/juegos/[id]`), Reproductor (`/jugar/[id]`), Auth (`/auth`), Salón de la Fama (`/salon`).
- `/` redirige a `/biblioteca`.
- Nav persistente (logo, links, contador de créditos estático, botón login/cuenta, menú móvil hamburguesa) en `app/layout.tsx`, junto con las capas decorativas de fondo (`av-bg`, `av-noise`) y el footer, igual que en `app.jsx`.
- Datos mock (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados a `lib/data.ts` tipado en TypeScript, sustituyendo los globals `window.*` del template.
- Sesión de usuario simulada (login/registro sin backend, cualquier usuario/contraseña entra) y puntuaciones guardadas, persistidas en `localStorage` bajo las mismas claves del template (`av_user`, `av_scores`), gestionadas por un contexto de cliente compartido entre Nav, Auth y Reproductor.
- Reproductor con la simulación falsa de partida del template: timer que incrementa el score al azar, sube de nivel cada 2500 puntos, pausa, fin de partida con modal y guardado de puntuación.
- Estilos: reutilizar `app/globals.css`, que ya contiene el theming neón/pixel portado de `styles.css` (variables de color, tokens `@theme`, clases `.btn`, `.card`, `.chip`, `.cover-*`, etc.). Los componentes usan esas mismas clases, igual que hace el template.
- Estado "sin resultados" en Biblioteca cuando el filtro/búsqueda no encuentra nada.
- Manejo de ID de juego inexistente en `/juegos/[id]` y `/jugar/[id]` vía `notFound()` de Next.js.

**Explícitamente fuera de alcance:**
- Cualquier lógica de juego jugable real (colisiones, controles, física, etc.) — el "juego" en el reproductor sigue siendo decorativo/animado, no interactivo.
- Backend real de autenticación, validación de credenciales, o persistencia server-side.
- Botones de login social (Google/GitHub) funcionales — quedan como UI no funcional, igual que en el template.
- Sistema de créditos funcional (el contador "CRÉDITOS · 03" es estático/decorativo).
- Tests automatizados (no hay test runner configurado en el proyecto).
- Internacionalización — la UI queda en español, igual que el template.
- Modo claro/oscuro — solo existe el tema oscuro neón.

## Modelo de datos

Nuevo módulo `lib/data.ts` (puerto 1:1 de `references/templates/data.jsx` a TypeScript):

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS cover-*
  color: GameColor;
  best: number;
  plays: string;
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: string[];

export interface ScoreRow { rank: number; name: string; score: number; date: string; }
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Nuevo módulo `lib/session.tsx` (contexto de cliente, reemplaza el estado `user`/`handleSaveScore` que vivía en `app.jsx`):

```ts
export interface SessionUser { name: string; }
export interface ScoreEntry { game: string; score: number; name: string; at: number; }

interface SessionContextValue {
  user: SessionUser | null;
  login: (u: SessionUser | null) => void; // null = invitado
  signOut: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
}

export function SessionProvider({ children }: { children: React.ReactNode }): JSX.Element;
export function useSession(): SessionContextValue;
```

Persiste `user` en `localStorage["av_user"]` y el array de `scores` en `localStorage["av_scores"]`, igual que `app.jsx`.

## Plan de implementación

1. **`lib/data.ts`**: portar `data.jsx` a TypeScript tipado (interfaces `Game`, `ScoreRow`, arrays `GAMES`/`CATS`/`PLAYERS`, función `seededScores`). Sistema queda compilando pero sin UI nueva todavía.
2. **`lib/session.tsx`**: crear `SessionProvider`/`useSession` con la lógica de `localStorage` (`av_user`, `av_scores`) portada de `app.jsx`.
3. **`components/nav.tsx`**: portar `nav.jsx` a componente cliente. Usa `usePathname()` de `next/navigation` para resaltar el link activo (Biblioteca activo también en `/juegos/*` y `/jugar/*`), `useSession()` para mostrar "Iniciar Sesión" o `{user.name} ▾`, y estado local `open` para el panel móvil.
4. **`app/layout.tsx`**: envolver `children` en `SessionProvider`, montar `<Nav />`, las capas `.av-bg`/`.av-noise`, `<main className="av-main">{children}</main>` y el `<footer>` con el texto del template. Mantener los fonts (`Press_Start_2P`, `JetBrains_Mono`) ya configurados.
5. **`app/page.tsx`**: reemplazar el scaffold de create-next-app por un `redirect("/biblioteca")` de `next/navigation`.
6. **`components/game-card.tsx`**: portar `GameCard` de `biblioteca.jsx` (efecto tilt con `onMouseMove`/`onMouseLeave`, `ref`), recibe `game: Game` y navega con `<Link href={`/juegos/${game.id}`}>` (usando `useRouter().push` o Link con el botón interno usando `stopPropagation`).
7. **`app/biblioteca/page.tsx`**: portar `Library` de `biblioteca.jsx` (client component): buscador, chips de categoría, grid de `GameCard`, estado vacío "NO HAY RESULTADOS".
8. **`app/juegos/[id]/page.tsx`**: portar `GameDetail` de `detalle.jsx`. Si `GAMES.find` no encuentra el id, llamar a `notFound()`. Botón "JUGAR AHORA" navega a `/jugar/[id]`.
9. **`app/jugar/[id]/page.tsx`**: portar `GamePlayer` de `reproductor.jsx` como client component. Mismo `id` no encontrado → `notFound()`. Usa `useSession()` para nombre por defecto y `saveScore`. Mantiene el `setInterval` de simulación, pausa, modal de fin de partida con input de iniciales.
10. **`app/auth/page.tsx`**: portar `Auth` de `auth.jsx` como client component. Tabs "Iniciar sesión"/"Crear cuenta", formulario simulado, botón "Jugar como invitado", botones sociales no funcionales. Al enviar, llama `login()` del contexto y navega a `/biblioteca` con `useRouter().push`.
11. **`app/salon/page.tsx`**: portar `HallOfFame` de `salon.jsx` como client component. Tabs por juego, podio top 3, tabla de puntuaciones, fila "tu mejor marca" si hay `user` en sesión.
12. Revisar responsive (breakpoints ya definidos en `globals.css`) y limpiar `app/page.tsx`/scaffold restante (`app/favicon.ico` se mantiene).

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [ ] `/` redirige a `/biblioteca`.
- [ ] `/biblioteca` muestra el grid de juegos, el buscador filtra por título en tiempo real, los chips filtran por categoría, y aparece el estado "NO HAY RESULTADOS" cuando no hay coincidencias.
- [ ] Click en una `GameCard` (o su botón "JUGAR") navega a `/juegos/[id]` del juego correspondiente.
- [ ] `/juegos/[id]` muestra info del juego, tags, stats, leaderboard de 10 filas, y botones "JUGAR AHORA" (→ `/jugar/[id]`) y "VOLVER AL VAULT" (→ `/biblioteca`).
- [ ] `/juegos/id-inexistente` responde con la página 404 de Next.js.
- [ ] `/jugar/[id]` incrementa el score automáticamente cada ~220ms, sube de nivel cada 2500 puntos, el botón "PAUSA" detiene el incremento y cambia a "REANUDAR", el botón "FIN" abre el modal de fin de partida con el score final.
- [ ] En el modal de fin de partida, guardar la puntuación persiste en `localStorage["av_scores"]` y muestra el toast "▸ PUNTUACIÓN GUARDADA_"; "JUGAR DE NUEVO" reinicia el estado; "VOLVER AL VAULT" navega a `/biblioteca`.
- [ ] `/auth` permite alternar entre "Iniciar sesión" y "Crear cuenta", cualquier envío del formulario loguea al usuario (nombre en mayúsculas, máx. 10 caracteres) y navega a `/biblioteca`; "Jugar como invitado" loguea como invitado.
- [ ] Tras loguearse, el Nav muestra `{NOMBRE} ▾` en vez de "Iniciar Sesión"; recargar la página mantiene la sesión (persistida en `localStorage["av_user"]`).
- [ ] `/salon` muestra tabs por juego, podio (oro/plata/bronce), tabla de 12 filas, y si hay sesión iniciada añade la fila "▸ TU MEJOR MARCA EN [JUEGO]".
- [ ] El link activo del Nav se resalta correctamente en las 5 rutas (Biblioteca se resalta también en `/juegos/*` y `/jugar/*`).
- [ ] El menú hamburguesa funciona en viewport móvil (<840px) y se cierra al navegar o al hacer click en el backdrop.
- [ ] `npm run build` compila sin errores de TypeScript ni de rutas.

## Decisiones tomadas y descartadas

- **Rutas reales vs. hash router**: se descarta el router por hash del template (`app.jsx`) porque `AGENTS.md`/`CLAUDE.md` piden puertos a rutas reales de App Router. Rutas elegidas: `/biblioteca`, `/juegos/[id]`, `/jugar/[id]`, `/auth`, `/salon`.
- **Simulación de partida en el Reproductor**: se mantiene el timer aleatorio del template en vez de una pantalla 100% estática, porque es la única forma de mostrar los estados visuales (HUD progresando, pausa, fin de partida, guardado) sin escribir lógica de juego real. No hay inputs de teclado/mouse que controlen nada — sigue sin ser un juego jugable.
- **Persistencia de sesión y puntuaciones**: se mantiene `localStorage` con las mismas claves del template (`av_user`, `av_scores`) en vez de estado en memoria, para no perder la sesión al recargar.
- **Auth simulado**: se confirma que el login/registro no valida contra nada real; cualquier usuario/contraseña entra, igual que el template.
- **Estilos**: no se re-escribe `styles.css` a utilidades Tailwind puras. `app/globals.css` ya contiene el theming portado (variables, `@theme inline`, clases `.btn`/`.card`/`.chip`/etc.); los componentes reutilizan esas clases tal como lo hace el template, en vez de reinventar el diseño con utilidades sueltas.
- **Datos mock**: viven en `lib/data.ts` como módulo TypeScript importado normalmente, reemplazando los globals `window.GAMES`/`window.CATS`/`window.seededScores` del prototipo sin build step.
- **Estado de sesión compartido**: se introduce `lib/session.tsx` (Context de cliente) porque en rutas reales de Next.js el estado `user`/`scores` ya no puede vivir en un único componente `App` como en el SPA — Nav, Auth y Reproductor están en árboles de componentes distintos y necesitan la misma fuente de verdad.

## Riesgos identificados

- El efecto tilt 3D de `GameCard` (manipulación directa de `style.transform` vía `ref`) y el `setInterval` del Reproductor requieren que esos componentes sean Client Components (`"use client"`) — si se declaran como Server Components por error, la interactividad no funcionará.
- El contexto de sesión debe inicializar el estado leyendo `localStorage` solo en cliente (evitar mismatch de hidratación SSR); seguir el mismo patrón defensivo try/catch que usa `app.jsx`.
