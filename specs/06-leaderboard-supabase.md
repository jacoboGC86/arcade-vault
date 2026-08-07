# 06 — Leaderboard real con tablas `games` y `scores` en Supabase

**Estado:** Implementado
**Depende de:** [[04-integracion-supabase]]
**Fecha:** 2026-08-07

**Objetivo:** Reemplazar las puntuaciones simuladas (`localStorage`/`seededScores`) por un leaderboard real, guardando cada partida en una tabla `scores` de Supabase (con `game_id` referenciando una tabla `games` poblada por migración) y leyendo desde ahí en `/salon`.

## Alcance

**Incluido:**
- Migración SQL (vía `mcp__supabase__apply_migration`) que crea:
  - Tabla `games`: catálogo mínimo para servir de referencia (`id text primary key`, `title text not null`), poblada con los 8 ids/títulos actuales de `lib/data.ts` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroid`, `ranaria`, `duelo-pixel`) como parte de la misma migración (seed inicial, sin UI para altas).
  - Tabla `scores`: `id uuid primary key default gen_random_uuid()`, `game_id text not null references games(id)`, `name text not null`, `score integer not null`, `created_at timestamptz not null default now()`.
  - RLS habilitado en ambas tablas. `games`: policy de `SELECT` pública (`using (true)`). `scores`: policy de `SELECT` pública y policy de `INSERT` pública (`with check (true)`) — sin `UPDATE`/`DELETE` (deniegan por defecto al no tener policy). Coherente con que el proyecto todavía no tiene Supabase Auth real ([[04-integracion-supabase]] solo dejó la infraestructura base).
  - Índice en `scores(game_id, score desc)` para acelerar la consulta de top-N por juego que usará `/salon`.
- `lib/supabase/types.ts`: tipos generados con `mcp__supabase__generate_typescript_types` para las tablas nuevas; `lib/supabase/client.ts` y `lib/supabase/server.ts` se tipan con `SupabaseClient<Database>` en vez de genérico sin tipos.
- `lib/session.tsx`: `saveScore` deja de escribir en `localStorage` (`av_scores`) y pasa a ser `async`, insertando en Supabase vía el cliente browser (`lib/supabase/client.ts`): `supabase.from("scores").insert({ game_id: entry.game, name: entry.name, score: entry.score })`. Se elimina el tipo `ScoreEntry`/campo `at` si deja de usarse (Supabase genera `created_at` solo). `av_user` (login mock) no cambia — sigue en `localStorage`, fuera de alcance.
- `components/game-player.tsx`: el botón "GUARDAR PUNTUACIÓN" pasa a esperar (`await`) la promesa de `saveScore` y maneja el estado de error mínimo (si el insert falla, se muestra un texto de error simple en el modal en vez de cerrarlo silenciosamente); mientras está en vuelo, el botón se deshabilita para evitar doble insert.
- `app/salon/page.tsx`: reemplaza `seededScores(...)` por una consulta real a Supabase por juego activo (`tab`): `supabase.from("scores").select("name, score, created_at").eq("game_id", tab).order("score", { ascending: false }).limit(12)`, ejecutada desde el cliente (`lib/supabase/client.ts`) cada vez que cambia `tab`, con estado de carga (`loading`) mientras resuelve.
- Estado vacío en `/salon`: si la consulta para el juego activo devuelve 0 filas, se oculta el podio y la tabla y se muestra un mensaje ("AÚN NO HAY PUNTUACIONES PARA ESTE JUEGO") en su lugar.
- El bloque "▸ TU MEJOR MARCA EN {juego}" (hoy con datos inventados `youRank`/`youScore`) se elimina — sin Supabase Auth real no hay forma de saber cuál fila pertenece al usuario actual logueado; se puede retomar en un spec de auth futuro.

**Explícitamente fuera de alcance:**
- Supabase Auth real / relacionar `scores` con un usuario autenticado (columna `user_id`, RLS por usuario) — este spec guarda el nombre como texto libre, igual que hoy en el modal de fin de partida.
- Migrar `lib/data.ts` (home, biblioteca, detalle) a leer desde la tabla `games` — `games` existe solo como referencia/FK para `scores.game_id`; el catálogo visual sigue siendo el array estático de `lib/data.ts`, sin sincronización automática entre ambos.
- Pantalla o endpoint para crear/editar/borrar juegos en la tabla `games` — se puebla una única vez por migración.
- Paginación, filtros por fecha, o vistas de "mis puntuaciones" en `/salon` — solo top 12 por juego, orden por score descendente.
- Validación anti-trampa de puntuaciones (rate limiting, verificación de score plausible del lado servidor) — el INSERT público confía en el cliente, igual que el `localStorage` de hoy no tenía ninguna validación.
- Borrar o migrar datos existentes de `av_scores` en `localStorage` de usuarios actuales — simplemente se deja de leer/escribir esa clave.
- Tiempo real (suscripción a cambios de `scores` para actualizar `/salon` sin recargar) — la consulta se dispara al montar/cambiar de pestaña, no hay `realtime` subscription.

## Modelo de datos

```sql
create table public.games (
  id text primary key,
  title text not null
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on public.scores (game_id, score desc);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games are publicly readable" on public.games
  for select using (true);

create policy "scores are publicly readable" on public.scores
  for select using (true);

create policy "anyone can insert a score" on public.scores
  for insert with check (true);

insert into public.games (id, title) values
  ('bloque-buster', 'BLOQUE BUSTER'),
  ('caida', 'CAÍDA'),
  ('serpentina', 'SERPENTINA'),
  ('gloton', 'GLOTÓN'),
  ('invasores', 'INVASORES'),
  ('asteroid', 'ASTEROID'),
  ('ranaria', 'RANARIA'),
  ('duelo-pixel', 'DUELO PIXEL');
```

```ts
// lib/session.tsx
export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (u: SessionUser | null) => void;
  signOut: () => void;
  saveScore: (entry: ScoreEntry) => Promise<{ error: string | null }>;
}
```

## Plan de implementación

1. **Migración Supabase**: aplicar el SQL de arriba (`games`, `scores`, índice, policies, seed de los 8 juegos) contra el proyecto `tgxskeawwgywxwtblzvl` vía `mcp__supabase__apply_migration`. Confirmar con `mcp__supabase__list_tables` que ambas tablas y sus policies quedaron creadas.
2. **`lib/supabase/types.ts`**: generar con `mcp__supabase__generate_typescript_types` y guardar el resultado. Actualizar `lib/supabase/client.ts` y `lib/supabase/server.ts` para tipar `createClient` como `SupabaseClient<Database>`.
3. **`lib/session.tsx`**: cambiar `saveScore` a `async`, insertar en `scores` vía el cliente browser, devolver `{ error: string | null }` (mensaje legible si `error` de Supabase no es null). Quitar la lectura/escritura de `av_scores` en `localStorage` y el campo `at` de `ScoreEntry`.
4. **`components/game-player.tsx`**: hacer `await saveScore(...)` en el handler de "GUARDAR PUNTUACIÓN", deshabilitar el botón mientras está en vuelo, y mostrar el `error` devuelto (si existe) en el modal en vez de cerrarlo.
5. **`app/salon/page.tsx`**: reemplazar `seededScores(tab.length * 23 + 7, 12)` por un `useEffect`/estado que consulta `scores` filtrado por `tab` (top 12 por score), con `loading` mientras resuelve. Quitar el bloque "TU MEJOR MARCA" (`youRank`/`youScore`). Si la consulta devuelve 0 filas, renderizar el mensaje de estado vacío en vez de podio/tabla.
6. Verificar manualmente en `npm run dev`: jugar y guardar una puntuación en Asteroid y en otro juego con motor simulado (ej. `bloque-buster`), confirmar que aparece en `/salon` al elegir esa pestaña, y que un juego sin puntuaciones muestra el estado vacío.
7. `npm run build` sin errores de TypeScript.

Cada paso deja el proyecto compilando; el leaderboard queda funcionalmente completo al terminar el paso 5.

## Criterios de aceptación

- [x] Las tablas `games` y `scores` existen en el proyecto Supabase `tgxskeawwgywxwtblzvl`, con RLS habilitado, policies de `SELECT` públicas en ambas y de `INSERT` pública solo en `scores`.
- [x] `games` contiene exactamente los 8 ids/títulos actuales del catálogo (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroid`, `ranaria`, `duelo-pixel`).
- [x] Guardar una puntuación desde el modal de fin de partida (cualquier juego del catálogo) inserta una fila real en `scores` con `game_id`, `name` y `score` correctos, verificable vía consulta a Supabase.
- [x] `saveScore` ya no lee ni escribe `localStorage.av_scores`.
- [x] `/salon` muestra, para el juego seleccionado, las puntuaciones reales de `scores` ordenadas de mayor a menor (hasta 12), no `seededScores()`.
- [x] Un juego sin ninguna puntuación guardada muestra el mensaje de estado vacío en `/salon` en vez de podio/tabla con datos falsos.
- [x] El bloque "TU MEJOR MARCA EN {juego}" ya no aparece en `/salon`.
- [x] Si el insert a Supabase falla (ej. red caída), el modal de fin de partida muestra un mensaje de error en vez de fallar silenciosamente o cerrarse como si hubiera guardado.
- [X] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Dos tablas (`games` + `scores`) en vez de una sola `scores` con `game_id` como texto libre sin FK**: decisión explícita del usuario — se prefiere integridad referencial (`scores.game_id` no puede apuntar a un juego inexistente) aunque implique mantener `games` sincronizada a mano con `lib/data.ts`.
- **`games` solo como FK, no reemplaza `lib/data.ts`**: decisión explícita del usuario — migrar home/biblioteca/detalle a leer desde Supabase es un cambio de mucho mayor alcance (fetching en varias rutas Server Component existentes) que no corresponde a este spec centrado en el leaderboard.
- **Sin UI de administración de `games`**: se puebla una única vez por migración porque el catálogo de 8 juegos es fijo hoy; no hay presupuesto en este spec para un panel de administración.
- **Insert público sin Supabase Auth**: igual que hoy con `localStorage`, cualquiera puede "guardar" una puntuación con cualquier nombre — no hay forma de asociarla a un usuario real porque [[04-integracion-supabase]] no implementó Auth todavía. Queda documentado como riesgo, no como bug a resolver aquí.
- **Escritura directa desde el cliente (browser) en vez de una Route Handler intermedia**: decisión explícita del usuario — más simple y consistente con que todavía no hay lógica server-side que necesite validar o transformar el insert.
- **`localStorage` (`av_scores`) se elimina en vez de mantenerse en paralelo**: decisión explícita del usuario — Supabase pasa a ser la única fuente de verdad para puntuaciones; mantener ambas hubiera significado dos fuentes potencialmente desincronizadas sin que nada lea la copia local.
- **Top 12 con estado vacío en vez de rellenar con `seededScores` cuando faltan filas**: decisión explícita del usuario — se prefiere mostrar honestamente que un juego no tiene puntuaciones reales todavía antes que mezclar datos falsos con reales en la misma tabla.
- **Se elimina el bloque "TU MEJOR MARCA" en vez de intentar aproximarlo**: sin Auth real no existe una forma no inventada de saber qué fila de `scores` pertenece al usuario logueado (el mock de `av_user` no tiene relación con ninguna fila insertada) — mostrarlo seguiría siendo un dato falso, esta vez además inconsistente con datos reales alrededor.

## Riesgos identificados

- `games` puede desincronizarse de `lib/data.ts` si en el futuro se agrega/renombra un juego en el catálogo estático sin actualizar la tabla (como pasó con el renombrado `rocas` → `asteroid` en [[05-motor-de-juegos-y-asteroides]]) — un `game_id` nuevo sin fila correspondiente en `games` haría fallar el `insert` en `scores` por la FK.
- Sin Auth ni rate limiting, el insert público en `scores` es trivialmente abusable (cualquiera puede mandar miles de puntuaciones falsas vía la API de Supabase directamente, no solo desde la UI) — aceptado como limitación conocida, mismo nivel de confianza que tenía `localStorage` (que ni siquiera requería red).
- Regenerar `lib/supabase/types.ts` manualmente cada vez que cambie el esquema (no hay paso automatizado en CI) — si un futuro spec modifica `games`/`scores` sin regenerar los tipos, el código podría compilar contra tipos desactualizados.
