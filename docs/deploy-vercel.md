# Despliegue en Vercel

Guía paso a paso para llevar el sitio a producción. Nada de esto se ha ejecutado todavía en este entorno de desarrollo — no hay cuenta de Vercel ni base de datos gestionada conectadas aquí. Sigue estos pasos cuando estés listo para publicar de verdad.

## 1. Base de datos gestionada

El desarrollo local usa un PostgreSQL portátil (ver README → "Requisitos"), pero eso no sirve para producción — necesitas un Postgres accesible desde internet.

1. Crea una base de datos gestionada en [Neon](https://neon.tech) o [Supabase](https://supabase.com) (ambos tienen plan gratuito suficiente para empezar). Elige la región más cercana a donde esté la mayoría de tus visitantes.
2. Copia la connection string (formato `postgresql://usuario:password@host/basededatos?sslmode=require`) — la vas a necesitar como `DATABASE_URL` en el paso 3.
3. El comando `build` del proyecto (`package.json`) ya corre `prisma migrate deploy` automáticamente antes de `next build` — cada deploy en Vercel aplica solo las migraciones nuevas que falten, sin necesitar correr nada a mano ni exponer la connection string fuera de Vercel. `migrate deploy` (a diferencia de `migrate dev`) no genera migraciones nuevas ni pide confirmación — es el comando correcto para CI/producción, y es seguro que corra en cada build (si no hay migraciones pendientes, no hace nada).
4. (Opcional pero recomendado) Corre el seed para tener servicios/settings iniciales y un usuario admin de prueba:
   ```bash
   DATABASE_URL="<tu connection string de producción>" npx prisma db seed
   ```
   El seed crea `admin@tarotdebeto.local` / `Tarot2026!` (ver `prisma/seed.ts`) — **cambia esa contraseña de inmediato** vía `/recuperar-password` (el dashboard todavía no tiene un formulario propio de cambio de contraseña — es el flujo de "olvidé mi contraseña" el que existe hoy), o edita el seed antes de correrlo en producción si prefieres no crear ese usuario de prueba ahí.

## 2. Proyecto en Vercel

1. Sube este repositorio a GitHub/GitLab/Bitbucket si no lo has hecho.
2. En [vercel.com/new](https://vercel.com/new), importa el repositorio. Vercel detecta Next.js automáticamente — no hace falta configurar el build command ni el output directory.
3. **No despliegues todavía** — primero configura las variables de entorno (paso 3).

## 3. Variables de entorno

En el proyecto de Vercel → **Settings → Environment Variables**, agrega todas las de `.env.example`, con valores reales de producción:

| Variable | Notas para producción |
|---|---|
| `DATABASE_URL` | La connection string del paso 1. |
| `AUTH_SECRET` | Generar una nueva con `openssl rand -base64 32` — **no reutilices** la de desarrollo. |
| `NEXT_PUBLIC_SITE_URL` | El dominio real (ej. `https://tarotdebeto.com`), sin barra final. |
| `NEXT_PUBLIC_*` (marca, contacto, redes) | Igual que en desarrollo pero con los datos reales del negocio. |
| `PAYPAL_ENVIRONMENT` | `"production"` (ver sección 4 más abajo — no lo cambies hasta haber probado todo en sandbox). |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` | Credenciales de la app de PayPal **Live**, no las de sandbox. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` | Credenciales de un proveedor SMTP real (ej. Resend, Postmark, SES) — sin esto, los emails transaccionales (Fase 8) solo se registran en los logs de Vercel, nunca llegan al cliente. |
| `CRON_SECRET` | Generar con `openssl rand -base64 32`. |
| `WHATSAPP_BUSINESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Dejar vacías salvo que actives la integración real (ver `lib/whatsapp-business.ts`) — el contacto manual por `wa.me` funciona sin esto. |
| `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Opcionales — solo si quieres analítica activa (Fase 9). |

Marca todas como disponibles para **Production** (y, si vas a tener un entorno de staging con su propia base de datos, también para **Preview** — pero apuntando a una base de datos *distinta* a la de producción, nunca la misma).

## 4. Dominio y SSL

1. **Settings → Domains** → agrega tu dominio (ej. `tarotdebeto.com`).
2. Vercel te da los registros DNS a configurar en tu proveedor de dominio (normalmente un registro `A` o `CNAME`, según si es el dominio raíz o un subdominio).
3. El certificado SSL lo emite y renueva Vercel automáticamente — no hace falta configurar nada más.
4. Actualiza `NEXT_PUBLIC_SITE_URL` (paso 3) para que coincida exactamente con el dominio final, con `https://`.

## 5. Primer deploy

Con la base de datos ya migrada/sembrada (paso 1) y las variables configuradas (paso 3), dispara el deploy (push a la rama conectada, o **Deploy** en el dashboard de Vercel). Revisa el log de build — debe verse igual que `npm run build` local, sin ningún `[email]`/`[notify]` en la salida (ver la nota de la Fase 8 en el README sobre por qué eso importa).

## 6. PayPal: de Sandbox a Production

Sigue primero toda la guía de [`docs/paypal-sandbox.md`](paypal-sandbox.md) contra el entorno de sandbox y verifica el checklist completo (pago exitoso, webhook duplicado, expiración libera el horario) **antes** de tocar credenciales reales. Cuando estés listo para cobrar de verdad:

1. En [PayPal Developer](https://developer.paypal.com/dashboard/), pestaña **Live** (no Sandbox) → **Create App** — mismo proceso que en sandbox, pero esta vez conectado a tu cuenta Business real.
2. Copia el nuevo **Client ID**/**Secret** → `NEXT_PUBLIC_PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` en Vercel (paso 3), y cambia `PAYPAL_ENVIRONMENT` a `"production"`.
3. Configura el webhook igual que en sandbox (`docs/paypal-sandbox.md` paso 4), pero con la URL real de producción (`https://tudominio.com/api/paypal/webhook`) y un nuevo `PAYPAL_WEBHOOK_ID`.
4. Haz una consulta de prueba con un pago real pequeño (el servicio más barato del catálogo) para confirmar de punta a punta antes de anunciar el sitio públicamente.

## 7. Cron de mantenimiento

Sin esto, expirar reservas vencidas (con aviso por email) y mandar recordatorios (24h/2h antes) no ocurre solo en producción — solo con el botón manual del panel `/admin` (ver README → "Notificaciones", Fase 8).

En Vercel, la forma más simple es [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs): agrega a `vercel.json` (crear si no existe):

```json
{
  "crons": [{ "path": "/api/cron/maintenance", "schedule": "*/15 * * * *" }]
}
```

Esto dispara `GET /api/cron/maintenance` cada 15 minutos. Vercel Cron llama al endpoint sin autenticación propia — como la ruta exige el header `Authorization: Bearer <CRON_SECRET>` (ver `app/api/cron/maintenance/route.ts`), necesitas configurar esa cabecera en la definición del cron (Vercel permite fijar headers custom en `vercel.json` en planes que lo soportan) o, si tu plan no lo permite, usar un servicio externo (ej. [cron-job.org](https://cron-job.org) o GitHub Actions con un `schedule` + `curl`) que sí pueda mandar ese header.

## 8. Backups y logs

- **Backups de base de datos**: Neon y Supabase hacen backups automáticos en sus planes pagos (revisa la retención de tu plan específico — el free tier suele tener retención corta o ninguna). Si el negocio depende de estos datos, considera un plan pago o un backup manual periódico (`pg_dump` contra la connection string de producción).
- **Logs de la aplicación**: Vercel guarda logs de cada invocación (build y runtime) en el dashboard del proyecto, con retención limitada según el plan. Los `console.error("[notify] ...")` (Fase 8) y errores no capturados aparecen ahí — revísalos periódicamente, sobre todo tras el primer deploy con SMTP/PayPal reales.
- **Logs de PayPal**: el dashboard de PayPal Developer (pestaña **Live** → tu app → **Webhooks**) muestra el historial de eventos enviados y si tu endpoint respondió 200 — útil para depurar si un pago no se reflejó como esperado.

## 9. Usuario admin de prueba

El seed (`prisma/seed.ts`) crea `admin@tarotdebeto.local` / `Tarot2026!` con rol `ADMIN`. Si lo corriste en producción (paso 1), **cambia esa contraseña de inmediato** vía `/recuperar-password`, o crea un admin nuevo con datos reales y luego elimina esa cuenta de prueba directamente en la base de datos:

```sql
DELETE FROM "User" WHERE email = 'admin@tarotdebeto.local';
```
