# 07 — Puntuaciones reales en la página de detalle de juego

**Estado:** Implementado
**Depende de:** [[06-leaderboard-supabase]]
**Fecha:** 2026-08-07

**Objetivo:** Reemplazar en `app/juegos/[id]/page.tsx` los datos simulados (`seededScores` y `game.best`) por puntuaciones reales leídas de la tabla `scores` de Supabase, tanto en la tabla "MEJORES PUNTUACIONES" como en el stat "Mejor global".

## Alcance

**Incluido:**
- `app/juegos/[id]/page.tsx` sigue siendo un Server Component async; se le agrega una consulta a `scores` vía `lib/supabase/server.ts` (`createClient()`), filtrando por `game_id` igual al `id` de la ruta.
- Tabla "MEJORES PUNTUACIONES": reemplaza `seededScores(id.length * 17 + 3, 10)` por `supabase.from("scores").select("name, score, created_at").eq("game_id", id).order("score", { ascending: false }).limit(10)` (se mantiene el límite de 10 filas actual).
- Stat "Mejor global" (`div.v` bajo "Mejor global"): en vez de `game.best`, se calcula como el score máximo real para ese juego. Puede obtenerse de la primera fila de la misma consulta ordenada por score descendente (no requiere una segunda query).
- Estado vacío: si la consulta no devuelve filas, la tabla de puntuaciones muestra el mismo mensaje que `/salon` ("AÚN NO HAY PUNTUACIONES PARA ESTE JUEGO") en vez de las filas, y el stat "Mejor global" muestra `—` en vez de un número.
- Formato de fecha: igual que `/salon`, `new Date(r.created_at).toLocaleDateString("es-ES")`.

**Explícitamente fuera de alcance:**
- El stat "Partidas" (`game.plays`) — sigue siendo el dato estático de `lib/data.ts`, no se calcula un conteo real de partidas.
- El campo `best` del tipo `Game` en `lib/data.ts` — se deja tal cual (sigue existiendo y puede usarse en otras pantallas como `biblioteca`); esta página simplemente deja de leerlo.
- Cualquier cambio a `app/salon/page.tsx`, `lib/session.tsx` o el modal de guardado de puntuación — ya implementados en [[06-leaderboard-supabase]].
- Convertir la página a Client Component o agregar estado de `loading` — al ser Server Component, el fetch ocurre antes del render, sin spinner.
- Tiempo real / revalidación automática al guardar una puntuación — la página se re-renderiza solo en la siguiente navegación (comportamiento por defecto de Next.js para Server Components), sin suscripción a cambios.

## Modelo de datos

No se introduce ningún dato nuevo. Se reutilizan las tablas `games`/`scores` creadas en [[06-leaderboard-supabase]]; esta página solo agrega una lectura adicional sobre `scores` con un `game_id` distinto al de `/salon` (el de la ruta actual en vez de una pestaña seleccionada por el usuario).

## Plan de implementación

1. **`app/juegos/[id]/page.tsx`**: importar `createClient` desde `@/lib/supabase/server` (en vez de/junto a `seededScores` de `@/lib/data`, que deja de usarse en este archivo).
2. Tras resolver `id` y encontrar `game`, ejecutar `const { data } = await (await createClient()).from("scores").select("name, score, created_at").eq("game_id", id).order("score", { ascending: false }).limit(10)`.
3. Mapear `data` a las filas que consume el JSX actual (`rank`, `name`, `score`, `date`), igual que hace `app/salon/page.tsx` con `created_at`.
4. Calcular `best` como `data?.[0]?.score` (ya viene ordenado descendente); si no hay filas, `best` es `undefined`.
5. En el JSX: el stat "Mejor global" muestra `best !== undefined ? best.toLocaleString("es-ES") : "—"`. La tabla de puntuaciones muestra las filas si hay datos, o el mensaje de estado vacío ("AÚN NO HAY PUNTUACIONES PARA ESTE JUEGO") si `data` está vacío.
6. Verificar manualmente en `npm run dev`: abrir el detalle de un juego con puntuaciones guardadas (ej. `asteroid` después de jugar y guardar en [[06-leaderboard-supabase]]) y confirmar que la tabla y "Mejor global" muestran los datos reales; abrir el detalle de un juego sin puntuaciones guardadas y confirmar el estado vacío y el `—`.
7. `npm run build` sin errores de TypeScript.

Cada paso deja el proyecto compilando; la página queda funcionalmente completa al terminar el paso 5.

## Criterios de aceptación

- [x] `app/juegos/[id]/page.tsx` ya no llama a `seededScores`.
- [x] La tabla "MEJORES PUNTUACIONES" muestra hasta 10 filas reales de `scores` para el `game_id` de la ruta, ordenadas de mayor a menor puntuación.
- [x] El stat "Mejor global" muestra el score máximo real de `scores` para ese juego, no `game.best`.
- [x] Si el juego no tiene puntuaciones guardadas: la tabla muestra "AÚN NO HAY PUNTUACIONES PARA ESTE JUEGO" y "Mejor global" muestra `—`.
- [x] Las fechas de la tabla se formatean con `toLocaleDateString("es-ES")` a partir de `created_at`.
- [x] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Server Component con `lib/supabase/server.ts` en vez de convertir a Client Component**: decisión explícita del usuario — la página ya es un Server Component async y no necesita estado de `loading`; el fetch en servidor es más simple y consistente con el resto de la página (que también resuelve `params` de forma async).
- **"Mejor global" también entra en el alcance del spec** (no solo la tabla): decisión explícita del usuario — sería inconsistente mostrar puntuaciones reales en la tabla junto a un "Mejor global" inventado justo arriba.
- **`game.best` se deja en el tipo `Game`, sin eliminarse**: decisión explícita del usuario — otras pantallas (biblioteca, home) pueden seguir usándolo; eliminarlo del tipo excede el alcance de este spec centrado en la página de detalle.
- **Top 10 en vez de alinear a 12 como `/salon`**: decisión explícita del usuario — se mantiene el comportamiento visual actual de esta página.
- **Sin segunda query para "Mejor global"**: se reutiliza la primera fila de la consulta ya ordenada por score descendente en vez de un `select(score).order(...).limit(1)` aparte, porque el resultado es el mismo y evita una segunda petición a Supabase.
