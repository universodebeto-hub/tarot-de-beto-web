# Tarot de Beto

Plataforma web de la marca **Universo de Beto** (Alberto Arango, "Beto"): sitio de presentación, catálogo de servicios, agenda, reservas, pagos con PayPal y panel administrativo.

Construido con Next.js (App Router) + TypeScript + Tailwind CSS + Prisma/PostgreSQL. Autenticación propia (Server Actions + bcrypt + JWT en cookie httpOnly — ver sección "Autenticación" más abajo). Pagos con PayPal Checkout (ver sección "Pagos"). El resto del stack se incorpora progresivamente por fases.

## Requisitos

- Node.js 20.19+ o 22.13+
- npm
- PostgreSQL 14+ (local o remoto)

## Empezar

```bash
npm install
cp .env.example .env.local   # completar valores (marca, contacto, redes)
```

Crea también un archivo `.env` en la raíz con `DATABASE_URL` — la CLI de Prisma solo lee `.env`, no `.env.local` (Next.js sí lee ambos). Ejemplo:

```
DATABASE_URL="postgresql://usuario:password@localhost:5432/tarot_de_beto"
```

Luego aplica las migraciones y carga los datos iniciales:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Base de datos local sin instalador (Windows)

Si no tienes PostgreSQL instalado y no quieres usar el instalador oficial, puedes usar los binarios portátiles (zip) de EnterpriseDB:

1. Descarga `postgresql-<version>-windows-x64-binaries.zip` desde https://www.enterprisedb.com/download-postgresql-binaries y descomprímelo donde quieras (ej. `%LOCALAPPDATA%\Programs\postgresql-portable`).
2. Inicializa el clúster: `bin\initdb.exe -D data -U postgres --pwfile=<archivo con la contraseña>`.
3. (Opcional) cambia el puerto en `data\postgresql.conf` si 5432 ya está en uso.
4. Arranca el servidor: `bin\pg_ctl.exe -D data -l pg.log start`.
5. Crea la base: `bin\createdb.exe -h localhost -U postgres tarot_de_beto`.
6. Usa esa conexión en `DATABASE_URL`.

Este proyecto se desarrolló así (Postgres 16.4 portátil, puerto 5433) por no tener un gestor de paquetes ni Docker disponibles en la máquina de desarrollo.

## Estructura

```
/app                    rutas (App Router)
/components/ui          componentes atómicos reutilizables (Button, Modal, Toast...)
/components/layout      Navbar, Footer, WhatsAppButton
/components/sections    bloques de página (Hero, ServiceGrid, Testimonials, FAQ...)
/components/auth        formularios de login/registro/recuperación (Fase 3)
/components/agenda      explorador de disponibilidad (Fase 4) + selector/tira/grilla compartidos
/components/booking     wizard de reserva, contador, panel de pago pendiente y botón PayPal (Fase 5-6)
/components/admin       sidebar, formularios y tablas del panel administrativo (Fase 7)
/config                 siteConfig — configuración central de marca desde env
/lib                     utilidades compartidas
/server                  lógica de servidor (a partir de Fase 2: acceso a datos)
/prisma                  esquema y migraciones de base de datos (Fase 2+)
/public/assets/logo      logo principal/alternativo, favicon
/public/assets/icons     iconos personalizados
/public/assets/images    fotografías, imagen OG
/public/assets/tarot     imágenes de cartas de tarot (decorativo)
/public/assets/backgrounds  texturas de fondo opcionales
/types                   tipos TypeScript compartidos
/hooks                   hooks de React reutilizables
```

## Variables de entorno

Ver `.env.example`. Las variables `NEXT_PUBLIC_*` son públicas (visibles en el navegador); el resto son secretos de servidor y nunca deben exponerse en el frontend. `DATABASE_URL` va en `.env` (no `.env.local`) para que la CLI de Prisma la detecte.

## Base de datos

Prisma + PostgreSQL. Esquema en `prisma/schema.prisma`, seed en `prisma/seed.ts`. Servicios y testimonios publicados se leen en tiempo real desde la base (`server/services.ts`, `server/testimonials.ts`); las páginas que los muestran usan revalidación incremental (`export const revalidate`) para reflejar cambios del panel admin (Fase 7) sin necesitar un redeploy completo.

## Autenticación

Implementación propia (no NextAuth) por estabilidad frente a lo reciente de Next.js 16: Server Actions para registro/login/logout/recuperación (`server/auth.ts`), contraseñas con `bcryptjs`, sesión firmada con `jose` (JWT) en una cookie `httpOnly`/`Secure` (en producción)/`SameSite=Lax`. Rutas protegidas vía `proxy.ts` (el archivo `middleware.ts` fue renombrado a `proxy.ts` en Next.js 16). El envío de emails de recuperación queda pendiente de la Fase 8 (SMTP); mientras tanto el link se registra en la consola del servidor.

### Usuarios de prueba (solo desarrollo — no válidos en producción)

Creados por `prisma/seed.ts`, contraseña `Tarot2026!` para ambos:

- `admin@tarotdebeto.local` — rol `ADMIN`, entra a `/admin`.
- `cliente@tarotdebeto.local` — rol `CLIENT`.

## Agenda

Motor de disponibilidad en `server/availability.ts` (`getAvailableSlots`): horario semanal (`Availability`, recurrente, minutos locales del negocio) menos bloqueos puntuales (`BlockedTime`, instantes UTC absolutos) menos la duración del servicio y el buffer entre consultas (`Setting.booking_buffer_minutes`, editable por admin en Fase 7). Todo el manejo de zona horaria vive en `lib/timezone.ts` (`date-fns-tz`), con la zona del negocio en `NEXT_PUBLIC_BUSINESS_TIMEZONE` (por defecto `America/Bogota`, sin horario de verano).

Vista pública en `/agenda` (selector de servicio + próximos 14 días + horarios); elegir un horario ahí lleva al wizard de reserva (`/reservar`) con ese servicio/fecha/hora ya preseleccionados.

## Reservas

Modelo `Booking` (`prisma/schema.prisma`): estado (`PENDING_PAYMENT/CONFIRMED/COMPLETED/CANCELLED/EXPIRED/RESCHEDULE_REQUESTED`), estado de pago (`UNPAID/PENDING/PAID/FAILED/REFUNDED`), `bookingNumber` correlativo (`BETO-<año>-00001`, generado atómicamente vía `Counter`), y `paymentDeadline` para la ventana de reserva temporal (`Setting.booking_payment_window_minutes`, 15 min por defecto).

**Wizard** (`/reservar`, `components/booking/BookingWizard.tsx`): 6 pasos — Servicio, Fecha, Hora (reutiliza el motor de agenda), Datos (formulario solo si no hay sesión iniciada; si el usuario ya inició sesión, se salta directo a confirmar), Pago y Confirmación (estas dos últimas se resuelven en la página de detalle de la reserva, `/reservas/[id]`, para que el enlace sea reutilizable/compartible).

**Prevención de doble reserva — dos capas**:
1. Antes de insertar, el servidor vuelve a calcular la disponibilidad real (`getAvailableSlots`) y rechaza si el horario ya no aparece ahí.
2. Índice único **parcial** en Postgres sobre `(serviceId, startsAt)` para reservas activas (`PENDING_PAYMENT`/`CONFIRMED`) — agregado a mano en la migración porque Prisma no soporta índices únicos parciales de forma declarativa. Si dos solicitudes concurrentes pasan la verificación 1 al mismo tiempo, la base de datos rechaza la segunda inserción (error Postgres 23505 → Prisma `P2002`), que el servidor traduce en un mensaje de "ese horario ya no está disponible".

**Expiración**: sin cron todavía — verificación perezosa (`expireStaleBookings`, en `server/availability.ts`) que pasa a `EXPIRED` cualquier `PENDING_PAYMENT` vencida, ejecutada antes de calcular disponibilidad, crear una reserva o leer el estado de una reserva existente. El contador visual (`CountdownTimer`) es solo informativo — la autoridad real es esta verificación en el servidor.

**Pago**: ver sección "Pagos" — mientras no haya credenciales de PayPal configuradas, o mientras el pago no se complete, la reserva queda `PENDING_PAYMENT`/`UNPAID` con un botón para confirmar el pago manualmente por WhatsApp (mencionando el número de reserva), sin simular una confirmación falsa.

**Calendario**: `/api/bookings/[id]/ics` genera un archivo `.ics` descargable para reservas que no estén `CANCELLED`/`EXPIRED`.

**Bug real encontrado y corregido en la Fase 5**: `businessLocalToUtc` (en `lib/timezone.ts`) no manejaba `minutesFromMidnight >= 1440` (medianoche del día siguiente) — construía una hora inválida (`"24:00:00"`), lo que hacía que la ventana de consulta `[inicio del día, fin del día)` usada para traer bloqueos/reservas del día colapsara a un solo instante. El síntoma: el motor de disponibilidad no excluía correctamente los horarios ya reservados. Corregido con aritmética de fecha explícita (ver la función). Afecta a cualquier código que dependa de "medianoche del día siguiente" — si aparecen fechas raras en el futuro, revisar ahí primero.

## Pagos (PayPal Checkout)

Guía completa de configuración: [`docs/paypal-sandbox.md`](docs/paypal-sandbox.md).

- `lib/paypal.ts`: cliente mínimo de la API REST de PayPal (OAuth2 client credentials, Orders v2, verificación de firma de webhook). Solo se importa desde código de servidor (`import "server-only"`).
- `server/paypal-orders.ts`: `createOrderForBooking` (crea la orden con el monto/moneda del servicio guardado en la reserva — nunca lo que mande el navegador) y `captureOrderForBooking` (captura y solo entonces marca la reserva `CONFIRMED`/`PAID`; idempotente si la orden ya estaba capturada).
- Endpoints: `POST /api/paypal/create-order`, `POST /api/paypal/capture-order` (llamados por el botón de PayPal, nunca hablan con PayPal directamente desde el navegador), `POST /api/paypal/webhook` (respaldo: verifica la firma contra la API de PayPal y es idempotente vía la tabla `PaypalWebhookEvent`, para el caso de que el usuario cierre la pestaña justo después de aprobar el pago).
- `components/booking/PayPalButton.tsx`: botón oficial, se muestra en `/reservas/[id]` **solo si** `NEXT_PUBLIC_PAYPAL_CLIENT_ID` está configurado; si no, la página se degrada limpiamente al panel de WhatsApp (sin romperse, sin credenciales de ejemplo inventadas). Verificado en este entorno de desarrollo (sin credenciales reales): los endpoints devuelven errores claros en vez de fallar, y la página de reserva no intenta cargar el SDK de PayPal cuando no hay Client ID.
- **Sin probar con credenciales reales todavía** — no hay cuenta de PayPal Developer en este entorno. Antes de usar en producción, seguir `docs/paypal-sandbox.md` completo (crear app, probar una reserva pagada de principio a fin, probar que un webhook reenviado no duplique la transacción).

## Panel administrativo

`/admin` (protegido por rol `ADMIN`, tanto en `proxy.ts` como con `requireAdmin()` dentro de cada Server Action mutadora — defensa en profundidad, ya que una Server Action es un endpoint de red por su cuenta).

- **Resumen** (`/admin`): reservas de hoy, pendientes de pago, pagos recibidos, próximas confirmadas, clientes registrados, ingresos totales.
- **Reservas** (`/admin/reservas`): filtros por estado/servicio/fecha/texto; detalle (`/admin/reservas/[id]`) con transiciones de estado válidas según el estado actual (`PENDING_PAYMENT → CONFIRMED/CANCELLED`, `CONFIRMED → COMPLETED/CANCELLED/RESCHEDULE_REQUESTED`, etc.), notas internas con autor y fecha, e historial de transacciones PayPal si las hay.
- **Calendario** (`/admin/calendario`): horario semanal (`Availability`, agregar/activar/desactivar/eliminar franjas) y bloqueos puntuales (`BlockedTime`, con o sin rango horario — vacío bloquea el día completo).
- **Clientes** (`/admin/clientes`): listado con buscador, reservas totales, última consulta, total gastado; detalle con historial completo.
- **Servicios** (`/admin/servicios`): CRUD completo (crear/editar/activar/desactivar) — los cambios se reflejan de inmediato en `/servicios`, `/agenda` y home vía `revalidatePath`, sin redeploy.
- **Testimonios** (`/admin/testimonios`): moderación (pendiente/aprobado/rechazado/publicado).
- **Configuración** (`/admin/configuracion`): editor genérico clave/valor (JSON) sobre la tabla `Setting`. Incluye `faq_items` (las preguntas frecuentes de Inicio y `/faq` ya se leen de ahí — `server/settings.ts` → `getFaqItems()` — con fallback al listado por defecto si la clave no existe). El resto del contenido editorial (Quiénes somos, políticas, textos de Inicio) sigue siendo copy fija en los componentes; seguir el mismo patrón (`Setting` + `getSetting()`) para ir migrándolo cuando se necesite, en vez de hardcodearlo de nuevo.
- **Auditoría**: cada mutación administrativa (cambio de estado de reserva, nota, servicio creado/editado, franja de horario, bloqueo, testimonio, setting) queda registrada en `AuditLog` (`server/audit.ts`) con quién, qué y cuándo.

Verificado en navegador con el flujo completo: crear una reserva → confirmarla manualmente desde el panel (pasa a `CONFIRMED`/`PAID`) → agregar nota interna → editar el precio de un servicio y ver el cambio en la página pública → crear un bloqueo de día completo y confirmar que desaparece de `/agenda` → moderar un testimonio → confirmar que un usuario `CLIENT` logueado es redirigido fuera de `/admin`.

## Notificaciones

Email transaccional (SMTP vía `nodemailer`, `lib/email.ts`): sin `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` configurados, `sendEmail()` no falla — registra el correo en consola (`[email] SMTP no configurado — no se envía. ...`) para poder desarrollar/probar sin credenciales reales. Plantillas (`server/notifications/templates.ts`) y despachadores (`server/notifications/send.ts`) para los 5 eventos: reserva recibida, pago confirmado, recordatorio, cancelación y expiración.

**Decisión de arquitectura — por qué la expiración perezosa NO manda email directamente**: `next build` ejecuta el cuerpo de las páginas de servidor durante la fase de "collect page data" para detectar qué rutas son dinámicas. Si una función que manda emails viviera ahí (por ejemplo, dentro de `expireStaleBookings`, que se llama desde casi cualquier lectura de reservas/disponibilidad), cada `build`/deploy podría disparar avisos reales a clientes — incluyendo el más delicado, "tu reserva expiró" — sin que hubiera ninguna solicitud real de por medio. Por eso:
- `server/availability.ts` → `expireStaleBookings()` solo cambia el estado a `EXPIRED`, sin notificar — sigue siendo seguro llamarla desde cualquier lectura, incluso durante el build.
- `server/notifications/expiry.ts` → `expireAndNotify()` hace lo mismo **y además notifica** — pero solo se invoca desde una Server Action real (botón del panel) o un Route Handler (`/api/cron/maintenance`), nunca desde el cuerpo de una página, porque esos dos sí solo se ejecutan ante una solicitud real y jamás durante el build.
- Regla general para el resto del proyecto: cualquier código con I/O externo (email, WhatsApp, pagos) debe vivir en una Server Action o un Route Handler, nunca directo en el cuerpo de un Server Component de página.

**Recordatorios**: `server/notifications/reminders.ts` → `sendDueReminders()` lee `Setting.reminder_hours_before` (por defecto `[24, 2]`), busca reservas `CONFIRMED` dentro de esa ventana y evita reenviar gracias a `Booking.remindersSentHours` (array de horas ya notificadas por reserva).

**Disparo**: sin cron configurado, tanto la expiración-con-aviso como los recordatorios no ocurren solos — el panel `/admin` tiene un botón manual ("Ejecutar mantenimiento ahora") para dispararlos bajo demanda. Para producción, `GET /api/cron/maintenance` (protegido con el header `Authorization: Bearer <CRON_SECRET>`, responde 503 si `CRON_SECRET` no está configurado y 401 si el token no coincide) está pensado para un cron externo (ej. Vercel Cron cada 15–30 min).

**WhatsApp**: hoy todo el contacto es manual vía enlaces `wa.me` con mensaje prellenado, generados contextualmente según página/servicio/reserva (`config/site.ts` → `buildWhatsAppLink`, número desde `NEXT_PUBLIC_WHATSAPP_NUMBER`, nunca hardcodeado). Arquitectura preparada pero **no implementada** para WhatsApp Business Cloud API (`lib/whatsapp-business.ts`) — el archivo documenta los pasos y variables (`WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) necesarios para activarla en el futuro.

**Bug real encontrado y corregido en la Fase 8**: `createPendingBooking` (`server/bookings.ts`) devolvía el `Booking` completo —incluyendo `service` (con `price` como `Decimal` de Prisma, que React no puede serializar hacia un Client Component) y `user` (¡con `passwordHash`!)— como resultado de una Server Action (`submitBooking`) llamada desde el wizard cliente. Eso filtraba el hash de contraseña del usuario hacia la respuesta de red del navegador. Corregido: la función ahora devuelve solo `{ id: booking.id }`, que es lo único que el wizard necesita para redirigir a `/reservas/[id]`; el registro completo (con `service`/`user`) se sigue usando internamente, solo para la notificación por email, sin cruzar nunca al cliente.

Verificado en navegador con el flujo completo: crear una reserva (log `[email] ... Reserva recibida`) → confirmar el pago manualmente desde `/admin/reservas/[id]` (log `[email] ... Pago confirmado`) → cancelar otra reserva (log `[email] ... Reserva cancelada`) → botón "Ejecutar mantenimiento ahora" en `/admin` → `GET /api/cron/maintenance` sin `CRON_SECRET` configurado devuelve `503`. También se confirmó, re-revisando el log completo de `npm run build`, que ningún email se dispara durante el build (ni antes de la Fase 8, gracias a la separación descrita arriba, ni después del arreglo del leak de `passwordHash`).

## SEO, seguridad y legales (Fase 9)

**SEO**: `app/sitemap.ts` y `app/robots.ts` (generadores nativos de Next.js, sirven `/sitemap.xml` y `/robots.txt` como rutas estáticas) — el sitemap solo lista páginas públicas indexables; el robots bloquea `/admin`, `/dashboard`, `/api` y las rutas de auth. Cada página privada o dependiente de sesión (`/admin/*`, `/dashboard`, `/login`, `/registro`, `/recuperar-password`, `/restablecer-password`, `/reservar`, `/reservas/[id]`, `/mantenimiento`) además lleva `robots: { index: false }` en su propio metadata, por si alguien enlaza a ella directamente. Cada página pública indexable tiene su propio `alternates.canonical` (URL absoluta vía `metadataBase`) — importante: el layout raíz ya traía `canonical: "/"`, y como Next.js **no** calcula un canonical distinto por ruta automáticamente, sin este arreglo todas las páginas heredaban el canonical de Home. Open Graph/Twitter cards básicas en el layout raíz (sin imagen todavía — no hay ningún asset de marca real en `public/assets/*`, solo carpetas placeholder; agregar `openGraph.images` cuando exista un logo/imagen de portada real). Datos estructurados `LocalBusiness` (Schema.org) en `components/seo/LocalBusinessJsonLd.tsx`, con `telephone`/`email`/`sameAs` solo si están configurados.

**Performance**: no había imágenes reales que optimizar (`public/assets/*` son carpetas vacías con solo un `README.md` placeholder) — cuando se agreguen assets de marca reales, usar `next/image` (ya incluido en Next.js, sin instalación adicional) en vez de `<img>`. El resto de la app ya es texto/CSS, sin bundle pesado que revisar.

**Seguridad**:
- Cabeceras HTTP (`next.config.ts` → `headers()`, aplicadas a toda ruta): `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`. La CSP usa `'unsafe-inline'` en `script-src` a propósito (Next App Router inyecta scripts de bootstrap inline y este proyecto no implementa el patrón de nonce por request) y `'unsafe-eval'` solo fuera de producción (lo necesita el overlay de errores de React en desarrollo). Dominios permitidos: PayPal (botón de pago) y GA/Meta Pixel/TikTok Pixel (analítica opcional, solo si están configurados).
- **Rate limiting** (`lib/rate-limit.ts`, ventana fija en memoria del proceso) en las Server Actions de auth: login (10/15min), registro (5/hora), solicitud de reset de contraseña (5/hora, responde éxito genérico igual si se alcanza el límite, para no filtrar información) y confirmación de reset (20/15min, defensa en profundidad — el token de 32 bytes ya es la protección real). **Limitación documentada**: en un despliegue serverless (Vercel), cada instancia de función tiene su propia memoria, así que el límite no es compartido entre instancias — sigue frenando ráfagas desde una misma IP/instancia, pero no es una garantía dura a escala. Si el abuso se vuelve un problema real, reemplazar por un store compartido (ej. Upstash Redis) sin tocar los call sites (misma firma de `checkRateLimit`).
- CSRF: cubierto por la protección nativa de Next.js para Server Actions (verificación de `Origin` en cada invocación) — sin código adicional necesario.
- XSS: cero usos de `dangerouslySetInnerHTML` con datos de usuario en todo el proyecto (el único uso, en `LocalBusinessJsonLd`, es `JSON.stringify` de datos propios de configuración, no HTML). Todo input de formularios pasa por `zod` antes de tocar la base de datos.
- Cookies: ya venían bien desde la Fase 3 (`httpOnly`, `secure` en producción, `sameSite: "lax"`) — revisado, sin cambios.
- Revisado que ningún secreto viva en una variable `NEXT_PUBLIC_*` (`PAYPAL_CLIENT_SECRET`, `SMTP_PASSWORD`, `CRON_SECRET`, `AUTH_SECRET`, `DATABASE_URL`, `WHATSAPP_BUSINESS_TOKEN` — todos sin el prefijo).

**Páginas legales** (`/privacidad`, `/terminos`, `/politica-de-reservas`, enlazadas desde el footer): usan un layout compartido (`components/legal/LegalArticle.tsx`) con un aviso visible de "texto de ejemplo — revisar legalmente antes de publicar". `/politica-de-reservas` sí lee el valor real de `Setting.booking_payment_window_minutes` en vez de hardcodear los minutos de la ventana de pago, para no desincronizarse si el admin lo cambia.

**Analítica opcional**: `components/analytics/Analytics.tsx` carga Google Analytics/Meta Pixel/TikTok Pixel vía `next/script`, cada uno solo si su variable (`NEXT_PUBLIC_GA_ID`/`NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID`) está configurada — mismo patrón de degradación limpia que el botón de PayPal.

**Bug real encontrado y corregido en la Fase 9** (aparte del canonical mencionado arriba): el link de restablecimiento de contraseña (`requestPasswordReset` en `server/auth.ts`) traía un `// TODO Fase 8: enviar por email` que quedó sin resolver al cerrar esa fase — el link solo se logueaba en consola. Corregido: ahora usa la infraestructura de notificaciones ya existente (`notifyPasswordReset`, nueva plantilla `passwordResetEmail` en `server/notifications/templates.ts`) para mandarlo de verdad (o loguearlo si no hay SMTP configurado, igual que el resto de emails).

Verificado en navegador: `/sitemap.xml` y `/robots.txt` sirven contenido correcto; cada página pública muestra su propio `<link rel="canonical">` y ninguna trae `<meta name="robots">`; `/dashboard` (privada) sí trae `<meta name="robots" content="noindex">`; las cabeceras de seguridad llegan en toda respuesta (confirmado con `curl -I`); intento de login fallido sigue mostrando el mensaje genérico y uno exitoso sigue llevando a `/dashboard` (el rate limiting no interfiere con el uso normal); solicitar recuperación de contraseña ahora sí dispara el log `[email] ... Restablecer tu contraseña` con el link real. Re-verificado con `npm run build` que sigue sin dispararse ningún email/notificación durante el build.

## Estado del proyecto

En construcción por fases. Fase actual: **Fase 9 — SEO, performance, seguridad y legales**.
