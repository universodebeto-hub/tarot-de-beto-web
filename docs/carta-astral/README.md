# Carta Astral automática — Bases del proyecto

Objetivo: que el servicio **Carta Astral** (`slug: carta-astral`) que ya se vende en
la web se prepare solo y Beto lo **revise a detalle en un panel y lo entregue él**.
Cuando la reserva queda pagada, el sistema calcula la carta y redacta un borrador;
Beto lo revisa, lo ajusta, descarga el PDF y lo envía como siempre. Hoy la web
promete entrega en "3 a 7 días" y todo el informe se arma a mano.

## Decisiones tomadas (2026-10-12)

1. **Todo en la web**, no en la PC. El panel de revisión es `/admin/informes`: se abre desde
   el navegador (PC o celular) solo con usuario administrador.
2. **Entrega manual.** Nunca se envía solo: el sistema deja el borrador, Beto aprueba y entrega,
   y marca "entregado".
3. **Privacidad (el repo es público):** los datos de clientes viven solo en la base de datos
   privada. El **PDF no se guarda en ningún almacenamiento** (Vercel Blob tiene enlaces
   accesibles por URL): se genera al momento en que Beto lo descarga. La IA recibe solo
   posiciones calculadas, nunca nombre, correo ni lugar exacto.
4. **Generación por secciones**, disparada con un clic de Beto: cada sección es una llamada corta,
   así no choca con el límite de tiempo de Vercel y se ve el avance.
5. **Textos base:** empezar solo con Sol, Luna y Ascendente revisados por Beto; la IA redacta el resto
   con su voz y se va puliendo.
6. **Al cerrar cada fase** se deja un resumen de lo que incluye (ver `05-plan-fases.md`).

## Lo que ya existe en la web y se reutiliza

| Pieza | Dónde | Uso para la carta astral |
| --- | --- | --- |
| Servicio "solo informe" | `lib/service-fulfillment.ts` (`REPORT_ONLY_SERVICE_SLUGS`) | `carta-astral` ya está marcado como informe, sin agenda |
| Datos de nacimiento | `lib/service-intake.ts` | Ya pide fecha, hora, ciudad y país en el wizard de reserva |
| Guardado de esos datos | `Booking.intakeData` (Json) en `prisma/schema.prisma` | Entrada del cálculo |
| Pago confirmado | `Booking.paymentStatus = PAID`, `paidAt` | Hace aparecer el informe en el panel |
| Panel admin | `app/admin`, `server/admin/` | Revisión detallada, edición, regeneración y descarga |
| Correo / notificaciones | `lib/email.ts` + `server/notifications/` | (Opcional, más adelante) aviso de "tu informe está listo" |

## Documentos

1. [01-especificacion.md](01-especificacion.md) — datos de entrada, fuentes de información, configuración astrológica, licencias
2. [02-contenido-informe.md](02-contenido-informe.md) — secciones del informe, extensión y tono
3. [03-interpretaciones.md](03-interpretaciones.md) — cómo se escriben los textos (base propia + IA)
4. [04-arquitectura-web.md](04-arquitectura-web.md) — cómo se integra en esta app Next.js y motor de cálculo elegido
5. [05-plan-fases.md](05-plan-fases.md) — plan por fases con criterios de terminado y resumen de cada fase

Tipos compartidos de la carta: `lib/astro/types.ts`.

## Flujo

```
Reserva pagada (carta-astral)
  → aparece en /admin/informes como PENDIENTE
  → Beto pulsa "Generar borrador"
  → leer intakeData → geocodificar ciudad (lat, lon, zona horaria histórica)
  → calcular carta (planetas, casas, aspectos)  ← nunca la IA
  → IA redacta sección por sección (solo ve posiciones, sin datos personales)
  → Beto revisa a detalle: datos, carta, textos, avisos de validación, vista previa
  → descarga el PDF (se genera al momento, no se guarda) y lo entrega como siempre
  → marca "entregado" → reserva COMPLETED
```

## Cómo arrancar en el computador con Claude Code

```bash
git fetch origin
git checkout carta-astral
npm install
```

Luego en Claude Code: **"Lee docs/carta-astral/ y sigamos con la siguiente fase pendiente."**
