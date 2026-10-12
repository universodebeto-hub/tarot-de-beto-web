# 04 · Arquitectura dentro de la web

Todo vive en esta app Next.js. La lógica nueva va en `server/astro/` y
`lib/astro/`, siguiendo el estilo del repo (lógica de servidor en `server/`,
utilidades compartidas en `lib/`). Antes de escribir código, leer
`AGENTS.md`: esta versión de Next tiene cambios respecto a lo conocido.

## Módulos

```
lib/astro/
  types.ts              # tipos de la carta (ya creado)
server/astro/
  geocode.ts            # ciudad/país → { lat, lon, timezone }
  engine.ts             # interfaz única: calcularCarta(datos) → CartaNatal
  engine-<impl>.ts      # implementación elegida en la Fase 0
  interpret.ts          # CartaNatal + textos base → secciones (IA)
  render.ts             # secciones + carta → HTML → PDF
  pipeline.ts           # orquesta todo para una reserva y guarda el estado
data/astro/textos/      # base de interpretaciones (JSON)
app/api/cron/astro/     # reintenta informes pendientes o fallidos
app/admin/informes/     # revisar, aprobar, regenerar y reenviar
```

Regla: `engine.ts` expone una sola función con tipos de `lib/astro/types.ts`.
Así se puede cambiar de motor sin tocar el resto.

## Motor de cálculo: opciones (decidir en la Fase 0)

| Opción | Cómo | A favor | En contra |
| --- | --- | --- | --- |
| A. Swiss Ephemeris en Node | Paquete npm con binding nativo de Swiss Ephemeris | Todo en TypeScript, máxima precisión, sin costo por informe | Módulo nativo: hay que probar que compile en Vercel; AGPL o licencia pro |
| B. Función Python en Vercel | Kerykeion en una función Python dentro del mismo proyecto | Kerykeion trae casas, aspectos, rueda SVG en español y serializador para IA | Dos lenguajes en el repo; confirmar soporte de funciones Python junto a Next en Vercel; AGPL |
| C. API externa | Astrologer API (Kerykeion alojado, de pago) | Cero infraestructura, sin obligación AGPL, trae SVG | Costo mensual/por llamada, dependencia de un tercero |
| D. Librería JS pura | Motor astronómico MIT + cálculo propio de casas y aspectos | Licencia libre, sin binarios | Más trabajo; sin Quirón ni algunos puntos; hay que validar mucho |

Recomendación: probar **A** en la Fase 0 (un endpoint de prueba desplegado en
una preview de Vercel). Si no compila o pesa demasiado, pasar a **C** para salir
rápido y evaluar **B** después.

## Rueda de la carta
- Opción A/D: dibujar la rueda como componente SVG propio (React), con los
  colores de la marca.
- Opción B/C: usar el SVG que entrega Kerykeion / la API.

## PDF
Funciones serverless no traen navegador. Opciones a probar en la Fase 4:
1. `@react-pdf/renderer` (puro JS, maquetación con componentes React).
2. Chromium serverless + Puppeteer (HTML/CSS completo, más pesado).
3. Servicio externo de HTML→PDF.
Empezar por la 1.

## Disparo y tiempos
- Al quedar una reserva `carta-astral` en `paymentStatus = PAID`, crear un
  registro de informe en estado `PENDIENTE` (no generar dentro de la petición del
  pago: puede exceder el tiempo límite).
- El cron `app/api/cron/astro` toma pendientes, ejecuta el pipeline y avanza el
  estado. Reintenta hasta 3 veces.
- Estados: `PENDIENTE → CALCULADO → REDACTADO → PDF_LISTO → EN_REVISION → ENVIADO` (o `ERROR`).
- Al enviar: correo con el enlace/adjunto, reserva → `COMPLETED`.

## Cambios en la base de datos (Prisma)
Nuevo modelo sugerido (migración en la Fase 5):

```prisma
model AstroReport {
  id          String   @id @default(cuid())
  bookingId   String   @unique
  booking     Booking  @relation(fields: [bookingId], references: [id])
  status      String   // ver estados arriba
  chartJson   Json?    // CartaNatal calculada
  sections    Json?    // textos por sección
  pdfUrl      String?  // Vercel Blob
  svgUrl      String?
  attempts    Int      @default(0)
  lastError   String?
  reviewedBy  String?
  sentAt      DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Variables de entorno nuevas (`.env.example`)
- `ANTHROPIC_API_KEY`
- `GEONAMES_USERNAME` (si se usa GeoNames)
- `ASTRO_REVIEW_REQUIRED` = `true` | `false` (revisión manual antes de enviar)
- `ASTROLOGER_API_KEY` (solo opción C)
