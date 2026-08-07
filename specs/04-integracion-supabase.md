# 04 — Integración base de Supabase

**Estado:** Aprobado
**Depende de:** —
**Fecha:** 2026-08-07

**Objetivo:** Conectar el proyecto Next.js con el proyecto Supabase existente (`tgxskeawwgywxwtblzvl`) creando los clientes browser/server, el middleware de refresco de sesión y un script de verificación, sin implementar todavía ninguna feature de auth, scores o perfiles (eso queda para specs futuros).

## Alcance

**Incluido:**
- Dependencias nuevas: `@supabase/supabase-js` y `@supabase/ssr`.
- `lib/supabase/client.ts`: factory `createClient()` para Client Components, usando `createBrowserClient` de `@supabase/ssr` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/supabase/server.ts`: factory `async createClient()` para Server Components/Route Handlers, usando `createServerClient` de `@supabase/ssr` con el adaptador de cookies de `next/headers`, siguiendo el patrón oficial de Next.js App Router.
- `lib/supabase/middleware.ts`: helper `updateSession(request)` que refresca el token de sesión de Supabase vía `createServerClient` + cookies del `NextRequest`/`NextResponse`.
- `middleware.ts` (raíz del proyecto): invoca `updateSession` en el `matcher` estándar (excluye assets estáticos), sin lógica de auth todavía — solo mantiene la sesión viva para cuando specs futuros la usen.
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (usando la publishable key moderna `sb_publishable_...` del proyecto `tgxskeawwgywxwtblzvl`, obtenida vía MCP de Supabase) añadidas a `.env.example` (placeholders) y `.env.local` (valores reales, gitignored — ya existe y ya contiene `SUPABASE_DB_PASSWORD`).
- `scripts/check-supabase.ts`: script de smoke test ejecutable con `tsx`/`node` que instancia el cliente server, hace una llamada real y de solo-lectura a Supabase (`supabase.auth.getSession()` y una consulta trivial, p. ej. `select 1` o listar `information_schema` si `auth.getSession()` no basta para confirmar conectividad de red) e imprime éxito/fallo por consola con código de salida acorde.
- Nuevo script npm `"check:supabase"` en `package.json` que ejecuta `scripts/check-supabase.ts`.
- Dependencia de desarrollo nueva si hace falta para ejecutar TypeScript standalone (`tsx`), a menos que se use `node --experimental-strip-types` ya soportado por la versión de Node del proyecto (verificar antes de añadir una dependencia nueva).

**Explícitamente fuera de alcance:**
- Cualquier tabla en la base de datos (`profiles`, `scores`, etc.), políticas de RLS, o migraciones — no se crea ningún esquema en este spec.
- Reemplazar `lib/session.tsx` (login/signup/scores simulados con localStorage) por Supabase Auth real — spec aparte.
- Conectar `app/auth/page.tsx`, `app/salon/page.tsx` o `components/game-player.tsx` a Supabase — siguen usando el mock actual sin cambios funcionales.
- Login social (Google/GitHub) — los botones de `auth.tsx` siguen decorativos.
- Cualquier UI visible permanente para probar la conexión — la verificación es vía script de terminal, no una pantalla.
- Tests automatizados con test runner — no hay uno configurado; el script de smoke test se ejecuta manualmente.

## Modelo de datos

No se introduce ningún esquema de base de datos en este spec (el proyecto Supabase permanece sin tablas en `public`). Único tipo nuevo, de configuración:

```ts
// lib/supabase/client.ts y lib/supabase/server.ts
// Ambos exportan una función createClient() que retorna SupabaseClient
// (tipado genérico, sin Database types generados — no hay esquema todavía)
```

## Plan de implementación

1. **Dependencias**: `npm install @supabase/supabase-js @supabase/ssr`. Verificar si la versión de Node del proyecto soporta ejecutar `.ts` standalone (`node --experimental-strip-types scripts/check-supabase.ts`); si no, añadir `tsx` como devDependency para el script de smoke test.
2. **Variables de entorno**: agregar `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` a `.env.example` (placeholders). Agregar los valores reales del proyecto `tgxskeawwgywxwtblzvl` (URL vía `get_project_url`, publishable key vía `get_publishable_keys`) a `.env.local` (ya gitignored).
3. **`lib/supabase/client.ts`**: crear con `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
4. **`lib/supabase/server.ts`**: crear `async function createClient()` con `createServerClient` de `@supabase/ssr`, leyendo/escribiendo cookies vía `cookies()` de `next/headers` (patrón `getAll`/`setAll` con try/catch para el caso de Server Component sin escritura).
5. **`lib/supabase/middleware.ts`**: crear `updateSession(request: NextRequest)` que instancia un `createServerClient` con el adaptador de cookies del `NextRequest`/`NextResponse`, llama a `supabase.auth.getUser()` para refrescar el token, y retorna el `NextResponse` con las cookies actualizadas.
6. **`middleware.ts`** en la raíz: importa `updateSession`, lo invoca en el handler `middleware(request)`, y exporta el `config.matcher` estándar recomendado por Supabase (excluye `_next/static`, `_next/image`, archivos con extensión de imagen, `favicon.ico`).
7. **`scripts/check-supabase.ts`**: usa el cliente server (o uno standalone con las mismas env vars, ya que el script corre fuera del ciclo de request de Next.js) para llamar `supabase.auth.getSession()` y una query mínima; loguea `[OK] Conectado a Supabase (<url>)` o `[ERROR] <mensaje>` con `process.exit(1)` en caso de fallo.
8. **`package.json`**: agregar el script `"check:supabase": "..."` (usando `tsx` o `node --experimental-strip-types` según lo decidido en el paso 1).
9. Ejecutar `npm run check:supabase` manualmente y confirmar que imprime éxito. Ejecutar `npm run build` y confirmar que compila sin errores de TypeScript ni de rutas (el `middleware.ts` nuevo no debe romper ninguna ruta existente).

Cada paso deja el proyecto compilando y navegable; ninguna pantalla existente cambia de comportamiento.

## Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` están en `package.json` (`dependencies`).
- [ ] `lib/supabase/client.ts` exporta un `createClient()` que instancia un cliente browser válido.
- [ ] `lib/supabase/server.ts` exporta un `createClient()` async que instancia un cliente server válido usando cookies de `next/headers`.
- [ ] `lib/supabase/middleware.ts` exporta `updateSession` y `middleware.ts` en la raíz lo invoca con el `matcher` correcto.
- [ ] `.env.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como placeholders sin valores reales.
- [ ] `.env.local` contiene los valores reales del proyecto `tgxskeawwgywxwtblzvl` y no se commitea (ya cubierto por `.gitignore`).
- [ ] `npm run check:supabase` se conecta al proyecto Supabase real y termina con éxito (exit code 0), imprimiendo confirmación por consola.
- [ ] Ninguna pantalla existente (`/`, `/biblioteca`, `/juegos/[id]`, `/jugar/[id]`, `/auth`, `/salon`, `/about`) cambia de comportamiento visible — el middleware nuevo no interfiere con la navegación actual.
- [ ] `npm run build` compila sin errores de TypeScript ni de rutas.

## Decisiones tomadas y descartadas

- **Solo integración, sin features**: se descarta implementar auth, scores o perfiles en este spec aunque el proyecto Supabase ya esté vacío y disponible — el usuario pidió explícitamente separar la conexión base de las funcionalidades, que irán en specs dedicados.
- **`@supabase/ssr` en vez de solo `@supabase/supabase-js`**: se usa el paquete oficial de Supabase para Next.js App Router (clientes browser/server + manejo de cookies) porque es el patrón recomendado por Supabase para SSR con cookies, necesario para que Auth funcione correctamente en specs futuros sin tener que reescribir la integración base después.
- **Middleware de refresco de sesión ahora, aunque no hay auth todavía**: se agrega `middleware.ts` en este spec (no en el spec de auth) porque es infraestructura transversal de la integración, y así el spec de auth puede enfocarse solo en las pantallas de login/signup sin tocar routing global.
- **Publishable key moderna (`sb_publishable_...`) en vez de la legacy anon key**: Supabase recomienda las publishable keys para proyectos nuevos por mejor seguridad y rotación independiente; se usa como valor de `NEXT_PUBLIC_SUPABASE_ANON_KEY` (el nombre de variable se mantiene como es convención en la comunidad/docs de Supabase, aunque el valor sea la publishable key).
- **Verificación vía script de smoke test, no UI temporal**: se descarta agregar una pantalla o componente de prueba visible porque el usuario lo pidió así — un script de terminal (`npm run check:supabase`) confirma la conexión sin dejar código de debug en las rutas de la app.
- **Sin esquema de base de datos**: no se crea ninguna tabla, RLS ni migración — el proyecto Supabase (`tgxskeawwgywxwtblzvl`) permanece sin tablas en `public` hasta que un spec futuro las defina según lo que necesiten auth/scores/perfiles.

## Riesgos identificados

- Si `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` faltan en el entorno de despliegue (Vercel u otro), el middleware y cualquier cliente fallarán en tiempo de ejecución — debe documentarse junto a las variables de Resend ya existentes en `.env.example`.
- El `matcher` del middleware debe excluir correctamente rutas estáticas y la API de `/api/contact` (spec 03) para no interferir con el envío de correos ni con el CSS/assets — revisar el patrón oficial de Supabase antes de aplicarlo literalmente.
- Ejecutar `scripts/check-supabase.ts` fuera del runtime de Next.js implica leer `process.env` manualmente (no hay carga automática de `.env.local` como en `next dev`) — el script debe cargar el archivo `.env.local` explícitamente (p. ej. con `dotenv` o el flag `--env-file` de Node) o documentarse que debe ejecutarse con las variables ya exportadas en el shell.
