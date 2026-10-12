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
  interpret.ts          # CartaNatal + textos base → UNA sección por llamada (IA)
  validate.ts           # avisos: la IA no puede contradecir la carta calculada
  pdf.ts                # secciones + carta → PDF (al momento, sin guardarlo)
  pipeline.ts           # pasos del informe y su estado, uno por clic
data/astro/textos/      # base de interpretaciones (JSON)
app/admin/informes/     # panel de revisión (lista + detalle)
app/api/admin/informes/[id]/pdf/route.ts   # descarga del PDF, solo admin
```

Regla: `engine.ts` expone una sola función con tipos de `lib/astro/types.ts`.
Así se puede cambiar de motor sin tocar el resto.

## Motor de cálculo: ELEGIDA la opción A (Fase 0)

**`sweph`** (Swiss Ephemeris para Node, módulo nativo N-API). Resultados de la Fase 0:

- Trae binarios precompilados para `linux-x64` (el que usa Vercel), `linux-arm64`,
  `win32-x64` y `darwin-arm64`: no hace falta compilar nada.
- Cruce con un motor independiente (`astronomy-engine`, MIT) en 4 fechas y los 10 planetas:
  diferencia máxima 0,005° (tolerancia del plan: 0,1°). El Sol en J2000 da 280,3689°
  (referencia publicada ~280,37°). Casas Placidus y Ascendente calculan correctamente.
  Script reproducible: `node scripts/astro-probe.mjs`.
- Sin archivos de efemérides funciona en modo interno (Moshier), suficiente para Sol a Plutón
  y nodos. **Quirón usa el archivo `seas_18.se1`** (223 KB, del repo oficial de
  Astrodienst, también AGPL), ya incluido en `data/astro/ephe/` (Fase 1).
- Requiere dos cosas en `next.config.ts` (ya aplicadas): `serverExternalPackages: ["sweph"]` y
  `outputFileTracingIncludes` para el binario de Linux **y el archivo de Quirón**, porque
  `node-gyp-build` y sweph los abren de forma dinámica y el rastreo de Next no los detecta (sin esto
  falla solo en producción). Verificado: ambos quedan dentro del paquete de las rutas.
- Falta confirmarlo corriendo en una preview de Vercel (ver `05-plan-fases.md`).

Alternativas descartadas por ahora: B (Python en Vercel), C (API externa de pago) y D (librería
JS pura, sin Quirón ni casas). C queda como plan B si algo falla en Vercel.

## Geocodificación y zona horaria (Fase 1)
- `server/astro/geocode.ts`: Nominatim (OpenStreetMap), una consulta por informe, con User-Agent propio
  (su política pide identificarse y no pasar de 1 consulta por segundo). Si algún día hace falta otro
  proveedor (ej. GeoNames), solo cambia ese archivo. Open-Meteo se descartó: su plan gratuito es solo para uso no comercial.
- Zona horaria: `tz-lookup` (dominio público, polígonos incluidos en el paquete, sin llamadas de red).
- Hora local → UTC en `lib/astro/time.ts` con `date-fns-tz` y las reglas históricas de la zona IANA.
- Pendiente para el panel (Fase 6): poder corregir a mano las coordenadas o elegir una alternativa cuando el
  servicio no encuentra el lugar o hay ciudades homónimas.

## Rueda de la carta
Dibujar la rueda como componente SVG propio (React), con los colores de la marca.

## PDF
Las funciones serverless no traen navegador. Empezar por `@react-pdf/renderer` (puro JS,
maquetación con componentes React; ya está en la lista de paquetes externos que Next reconoce).
El PDF se genera cuando Beto lo descarga y **no se guarda en ningún almacenamiento**.

## Flujo y tiempos
- Al quedar una reserva `carta-astral` en `paymentStatus = PAID`, el informe aparece en el panel
  como `PENDIENTE` (se puede crear al abrir el panel; no hace falta tocar el flujo de pago).
- Beto pulsa "Generar borrador": el panel avanza los pasos uno por uno
  (datos → carta → cada sección). Cada paso es una petición corta, con avance visible y
  reintento por paso, así no hay límite de tiempo que cruzar.
- Estados: `PENDIENTE → CALCULADO → REDACTADO → ENTREGADO` (o `ERROR` en un paso concreto).
- "Marcar como entregado" deja la reserva en `COMPLETED`.
- Aviso al cliente por correo: opcional y para después; la entrega la hace Beto.

## Panel `/admin/informes` (qué muestra por informe)
1. Datos de entrada y cómo los interpretó el sistema: fecha, hora y ciudad del cliente + coordenadas
   encontradas, zona horaria usada y hora convertida a UTC.
2. La carta: rueda, tabla de planetas (signo, grado, casa, retrógrado), 12 casas, aspectos con orbe.
3. Cada sección del informe: texto editable, factores usados y botón para regenerarla.
4. Avisos de validación: signo o casa mencionados que no coinciden con la carta calculada.
5. Vista previa del PDF y botón de descarga.
6. Acciones: regenerar, descargar, marcar como entregado. Solo usuarios `ADMIN`.

## Cambios en la base de datos (Prisma)
Nuevo modelo sugerido (migración en la Fase 5). **No hay `pdfUrl`**: el PDF no se guarda.

```prisma
model AstroReport {
  id          String   @id @default(cuid())
  bookingId   String   @unique
  booking     Booking  @relation(fields: [bookingId], references: [id])
  status      String   // ver estados arriba
  chartJson   Json?    // CartaNatal calculada
  sections    Json?    // textos por sección (editables por el admin)
  warnings    Json?    // avisos de validación
  lastError   String?
  deliveredAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

> **Cuidado con las preview de Vercel:** el script de build del proyecto ejecuta
> `prisma migrate deploy`. Si las preview usan la misma `DATABASE_URL` que producción,
> una rama con migraciones nuevas las aplicaría sobre la base real. Antes de la Fase 5,
> confirmar que las preview tengan su propia base de datos, o aplicar la migración
> con cuidado.

## Variables de entorno nuevas (`.env.example`)
- `ANTHROPIC_API_KEY` (redacción)
- (Ya no hace falta `GEONAMES_USERNAME`: la geocodificación usa Nominatim, sin cuenta ni clave.)
- La ruta temporal `/api/astro/probe` (solo Fase 0) no pide credenciales (devuelve solo el Sol de una fecha astronómica) y responde 404 en producción. Se borra al terminar la fase.
