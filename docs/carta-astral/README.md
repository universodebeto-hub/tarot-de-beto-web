# Carta Astral automática — Bases del proyecto

Objetivo: que el servicio **Carta Astral** (`slug: carta-astral`) que ya se vende en
la web se entregue solo. Cuando la reserva queda pagada, el sistema calcula la
carta, redacta el informe, genera el PDF, lo guarda en Vercel Blob y lo envía
por correo. Hoy la web promete entrega en "3 a 7 días" y la hace una persona;
con esto pasa a minutos (con revisión opcional antes de enviar).

## Lo que ya existe en la web y se reutiliza

| Pieza | Dónde | Uso para la carta astral |
| --- | --- | --- |
| Servicio "solo informe" | `lib/service-fulfillment.ts` (`REPORT_ONLY_SERVICE_SLUGS`) | `carta-astral` ya está marcado como informe, sin agenda |
| Datos de nacimiento | `lib/service-intake.ts` | Ya pide fecha, hora, ciudad y país en el wizard de reserva |
| Guardado de esos datos | `Booking.intakeData` (Json) en `prisma/schema.prisma` | Entrada del cálculo |
| Pago confirmado | `Booking.paymentStatus = PAID`, `paidAt` | Disparador de la generación |
| Archivos | Vercel Blob (`BLOB_READ_WRITE_TOKEN`) | Guardar PDF y rueda SVG |
| Correo | `lib/email.ts` + `server/notifications/` (SMTP) | Enviar el informe |
| Cron | `app/api/cron/` | Reintentos de informes fallidos |
| Panel admin | `app/admin`, `server/admin/` | Ver, revisar y reenviar informes |

## Documentos

1. [01-especificacion.md](01-especificacion.md) — datos de entrada, fuentes de información, configuración astrológica, licencias
2. [02-contenido-informe.md](02-contenido-informe.md) — secciones del informe, extensión y tono
3. [03-interpretaciones.md](03-interpretaciones.md) — cómo se escriben los textos (base propia + IA)
4. [04-arquitectura-web.md](04-arquitectura-web.md) — cómo se integra en esta app Next.js, opciones de motor de cálculo
5. [05-plan-fases.md](05-plan-fases.md) — plan por fases con criterios de terminado

Tipos compartidos de la carta: `lib/astro/types.ts`.

## Flujo

```
Reserva pagada (carta-astral)
  → leer intakeData → geocodificar ciudad (lat, lon, zona horaria histórica)
  → calcular carta (planetas, casas, aspectos)  ← nunca la IA
  → interpretar (textos base + IA redacta)
  → HTML con marca → PDF → Vercel Blob
  → (opcional) revisión en el panel admin
  → correo al cliente + reserva marcada COMPLETED
```

## Cómo arrancar en el computador con Claude Code

```bash
git fetch origin
git checkout carta-astral
npm install
```

Luego en Claude Code: **"Lee docs/carta-astral/ y arranquemos con la Fase 0."**
