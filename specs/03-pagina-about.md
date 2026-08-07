# 03 — Página "Acerca de" (About + Contacto)

**Estado:** Implementado
**Depende de:** SPEC 02
**Fecha:** 2026-08-06

**Objetivo:** Portar la página "Acerca de" (`references/templates/home-about/about.jsx`) a `app/about/page.tsx`, con un formulario de contacto que envía correos reales usando Resend a través de un route handler propio.

## Alcance

**Incluido:**
- `app/about/page.tsx`: puerto de `About` de `about.jsx` — hero "ACERCA DE ARCADE VAULT" con misión y highlight row (3 tarjetas con icono pixel-art: HEART, BROWSER, PLANT), divisor decorativo animado, y sección de contacto (`contact-grid` con intro + formulario).
- Efecto scroll-reveal (`useEffect` + `IntersectionObserver` sobre `.reveal`), igual patrón que `useReveal` de Home (spec 02) — mismo componente `"use client"`.
- `HighlightIcon` (SVGs inline con `<rect>`) portado igual que el template.
- Formulario de contacto (nombre, correo, mensaje):
  - Validación cliente: campos no vacíos → si falla, `shake` (animación) igual que el template, sin llamar al servidor.
  - Al enviar válido, se muestra el terminal (`terminal-success`) con el timeline animado `[OK] Conectando... / [OK] Validando... / [OK] Transmitiendo...` **mientras se espera la respuesta real** del `POST /api/contact`.
  - Si la respuesta es exitosa, se añade la línea final `> MENSAJE RECIBIDO...` (como el template) y el botón "ENVIAR OTRO MENSAJE" que resetea el formulario.
  - Si la respuesta falla (error de red o status no-2xx), se añade una línea `[ERROR] No se pudo enviar el mensaje. Intenta de nuevo.` al terminal y un botón para volver al formulario **sin perder lo escrito** (name/email/msg se conservan).
- `app/api/contact/route.ts`: Route Handler (`POST`) que valida el payload en servidor (name/email/msg no vacíos, email con formato válido vía regex simple) y, si es válido, envía el correo con el SDK de `resend` usando `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` como remitente y `CONTACT_TO_EMAIL` como destinatario. Responde 400 si la validación falla, 500 si Resend falla, 200 si se envía.
- Dependencia nueva: `resend` (SDK oficial) añadida a `package.json`.
- `.env.example` con `RESEND_API_KEY=`, `CONTACT_TO_EMAIL=`, `CONTACT_FROM_EMAIL=` (placeholders, sin valores reales). `.env.local` (gitignored, no se commitea) para los valores reales de desarrollo.
- `components/nav.tsx`: se agrega el link "Acerca de" → `/about` después de "Salón de la Fama", tanto en el nav de escritorio como en el panel móvil. Se resalta activo cuando `pathname.startsWith("/about")`.
- CSS: se portan a `app/globals.css` las reglas que About/Contacto consumen, tomadas de `references/templates/home-about/styles.css` — clases `about-*`, `highlight-row`/`highlight`/`hl-*`, `contact-*`, `field`, `terminal-success`/`term-*`/`line`/`dim`/`success`/`caret`, `shake`. Se revisa contra `app/globals.css` actual para no duplicar ni chocar con reglas ya portadas en spec 02.

**Explícitamente fuera de alcance:**
- Persistencia de los mensajes de contacto en base de datos — solo se envían por correo, no se guardan.
- Rate limiting / protección anti-spam (captcha, honeypot, límite de envíos) — no se implementa en este spec.
- Plantillas de correo HTML con diseño propio — el correo enviado vía Resend usa texto plano/HTML simple con los datos del formulario, sin branding adicional.
- Verificación de dominio en Resend o configuración de DNS — se asume que el usuario configura esto fuera del código, en su cuenta de Resend.
- Cualquier cambio a otras páginas (`/`, `/biblioteca`, `/juegos/[id]`, `/salon`, `/auth`) más allá del link "Acerca de" en el Nav.
- Tests automatizados (no hay test runner configurado).

## Modelo de datos

No se introducen tipos ni módulos nuevos en `lib/`. Estructuras nuevas, locales a sus archivos:

```ts
// app/about/page.tsx (estado local del formulario)
interface ContactForm { name: string; email: string; msg: string }

// app/api/contact/route.ts (payload esperado del POST)
interface ContactPayload { name: string; email: string; msg: string }
```

## Plan de implementación

1. **Dependencia**: instalar `resend` (`npm install resend`).
2. **Variables de entorno**: crear `.env.example` con `RESEND_API_KEY=`, `CONTACT_TO_EMAIL=`, `CONTACT_FROM_EMAIL=`. Confirmar que `.env.local` está en `.gitignore` (no commitear valores reales).
3. **`app/api/contact/route.ts`**: Route Handler `POST` — parsear JSON body, validar `name`/`email`/`msg` no vacíos y `email` con regex simple; si falla, `NextResponse.json({ error }, { status: 400 })`. Si pasa, instanciar `new Resend(process.env.RESEND_API_KEY)` y llamar `resend.emails.send({ from: CONTACT_FROM_EMAIL, to: CONTACT_TO_EMAIL, subject, text/html })`; si Resend lanza error, `NextResponse.json({ error }, { status: 500 })`; si éxito, `NextResponse.json({ ok: true })`.
4. **CSS**: copiar a `app/globals.css` las reglas listadas en el alcance, tomadas de `references/templates/home-about/styles.css`, verificando solapes con lo ya portado en spec 02.
5. **`app/about/page.tsx`**: crear componente cliente (`"use client"`), portando de `about.jsx`: hero, `highlight-row` con `HighlightIcon`, divisor `.reveal`, y sección de contacto con el hook de scroll-reveal. El formulario hace `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })` en vez de simular el envío; mientras espera la respuesta se muestra el terminal con el timeline animado (mismas líneas `[OK]` con delays via `setTimeout`/animación CSS); al resolver, añade la línea de éxito o de error según corresponda.
6. **`components/nav.tsx`**: agregar el link "Acerca de" → `/about` después de "Salón de la Fama" en `.links` (desktop) y en `.av-mobile-panel` (móvil); extender `isActive` para incluir `"about"` con `pathname.startsWith("/about")`.
7. Revisar responsive de About/Contacto (breakpoints ya definidos en `globals.css`) y confirmar que el formulario y el terminal no rompen el layout en móvil.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [ ] `/about` renderiza la página con hero, misión, highlight row (3 tarjetas) y divisor animado.
- [ ] La sección de contacto muestra la intro (tips) y el formulario con campos nombre/correo/mensaje.
- [ ] Enviar el formulario con algún campo vacío dispara la animación `shake` y no llama a `/api/contact`.
- [ ] Enviar el formulario válido muestra el terminal con el timeline animado mientras espera la respuesta real de `POST /api/contact`.
- [ ] Si `POST /api/contact` responde éxito, el terminal muestra la línea final "MENSAJE RECIBIDO..." y el botón "ENVIAR OTRO MENSAJE" resetea el formulario.
- [ ] Si `POST /api/contact` falla (red o status no-2xx), el terminal muestra una línea de error y permite volver al formulario sin perder lo escrito.
- [ ] `app/api/contact/route.ts` valida `name`/`email`/`msg` no vacíos y formato de email; responde 400 si la validación falla.
- [ ] `app/api/contact/route.ts` envía el correo vía Resend usando `RESEND_API_KEY`/`CONTACT_FROM_EMAIL`/`CONTACT_TO_EMAIL`; responde 500 si Resend falla, 200 si se envía.
- [ ] `.env.example` existe con las 3 variables como placeholders; no hay valores reales commiteados.
- [ ] El link "Acerca de" aparece en el Nav (desktop y móvil) después de "Salón de la Fama", navega a `/about`, y se resalta activo cuando `pathname` empieza con `/about`.
- [ ] `npm run build` compila sin errores de TypeScript ni de rutas.

## Decisiones tomadas y descartadas

- **Route Handler en vez de Server Action**: se usa `app/api/contact/route.ts` (POST) en vez de una Server Action inline, siguiendo el patrón estándar de Next.js App Router para integraciones con servicios externos, y porque mantiene la lógica de Resend aislada y testeable por separado del componente de UI.
- **Espera real en vez de UX optimista**: el timeline animado del template (que no espera respuesta) se adapta para esperar la respuesta real de `/api/contact`, ya que ahora el envío es real y puede fallar — mostrar éxito falso sería engañoso.
- **Estado de error dentro del terminal**: se mantiene la estética de terminal para el error (en vez de volver al formulario con un mensaje plano) para conservar la identidad visual "VAULT-OS" del template en ambos casos (éxito y error).
- **Sin persistencia ni anti-spam**: fuera de alcance porque el template no define esa necesidad y el usuario no la pidió; se puede spec-ear aparte si se vuelve necesario.
- **Nav con "Acerca de" agregado ahora**: a diferencia de la spec 02 (donde se dejó fuera porque `/about` no existía), aquí sí se agrega porque la ruta pasa a existir en este mismo spec.
- **Validación de email con regex simple en servidor**: se evita añadir una librería de validación (p. ej. zod) solo para este campo — regex simple es suficiente y no introduce una dependencia nueva no solicitada.

## Riesgos identificados

- Si `RESEND_API_KEY` no está configurada en el entorno de despliegue, todo envío de contacto fallará con 500 — debe documentarse en `.env.example` y verificarse antes de desplegar.
- El dominio de `CONTACT_FROM_EMAIL` debe estar verificado en la cuenta de Resend; si no lo está, Resend rechazará el envío aunque el código sea correcto (fuera de alcance de este spec, pero afecta si el criterio de aceptación de envío real se prueba en producción).
- El timeline animado con `setTimeout` debe limpiarse correctamente si el componente se desmonta antes de que termine (navegación rápida fuera de `/about`), para evitar `setState` sobre un componente desmontado.
