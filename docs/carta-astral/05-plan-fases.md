# 05 · Plan por fases

Cada fase termina con algo que se puede probar. Marcar `[x]` al completar. **Al cerrar cada fase
se deja un "Resumen" de lo que incluye**, para saber qué se avanzó.

## Fase 0 · Decidir el motor (1–2 días)
- [x] Probar opción A (Swiss Ephemeris en Node) en local — `scripts/astro-probe.mjs`
- [x] Verificar que el binario de Linux viaja con la función (`outputFileTracingIncludes`)
- [ ] Abrir `<url de la preview>/api/astro/probe` (con sesión de Vercel) y comprobar `plataforma: linux` y `ok: true`
- [ ] Si falla en Vercel, probar opción C (API externa) y anotar costo por informe
- [ ] Confirmar configuración: tropical, Placidus, puntos y orbes (`01-especificacion.md`)
- [ ] Decidir el camino de licencia (`01-especificacion.md`, sección Licencias)
- **Terminado cuando:** un endpoint de prueba devuelve el Sol de una fecha conocida correcto al 0,1° **en Vercel**.

**Resumen Fase 0 (avance al 2026-10-12):**
- Motor elegido: `sweph` (Swiss Ephemeris para Node). Instalado junto a `astronomy-engine` (MIT) solo como control.
- Precisión comprobada: 4 fechas × 10 planetas, los dos motores coinciden dentro de 0,005° (límite 0,1°).
  Sol en J2000 = 280,3689° (referencia ~280,37°). Casas Placidus, Ascendente y Medio Cielo calculan bien.
  Retrogradación detectada correctamente.
- Integración con Next: `next.config.ts` con `serverExternalPackages` y `outputFileTracingIncludes`; el
  binario de Linux queda empaquetado en la ruta de prueba (verificado en el manifiesto de la compilación).
- Compilación, tipos y pruebas existentes: sin errores.
- Pendiente: correrlo en una preview de Vercel (no hay Linux local para probarlo) y decisiones de configuración y licencia.

## Fase 1 · Cálculo (2–3 días)
- [ ] `server/astro/geocode.ts` con zona horaria histórica
- [ ] `server/astro/engine.ts` devolviendo `CartaNatal` completa
- [ ] Agregar `seas_18.se1` para Quirón
- [ ] Casos: hora exacta, aproximada, desconocida
- [ ] Pruebas con 5 cartas de referencia vs astro.com (vitest)
- **Terminado cuando:** las 5 cartas cuadran dentro de la tolerancia.

## Fase 2 · Base de textos (paralelo, la lleva Beto)
- [ ] Generar borradores de `data/astro/textos/*.json` con IA
- [ ] Beto revisa y ajusta la voz — **empezar solo por Sol, Luna y Ascendente**; la IA redacta el resto
      con su voz y se va puliendo después
- **Terminado cuando:** Sol, Luna y Ascendente (los 12 signos de cada uno) están revisados por Beto.

## Fase 3 · Redacción con IA (2–3 días)
- [ ] `server/astro/interpret.ts`, una llamada por sección
- [ ] La IA recibe solo posiciones calculadas (nunca nombre, correo ni lugar)
- [ ] `server/astro/validate.ts`: avisos anti-invento (signo/casa mencionados deben coincidir con la carta)
- [ ] Medir tokens y costo por informe
- **Terminado cuando:** 3 informes de prueba (con datos inventados) leídos por Beto sin errores de datos.

## Fase 4 · PDF (2–3 días)
- [ ] Rueda SVG con colores de la marca
- [ ] Plantilla con portada, tablas, secciones y pie de página (`@react-pdf/renderer`)
- [ ] El PDF se genera al momento de descargarlo; **no se guarda en ningún almacenamiento**
- **Terminado cuando:** el PDF se ve bien en celular y computador.

## Fase 5 · Integración con reservas (2–3 días)
- [ ] Modelo `AstroReport` + migración (ver el cuidado con las preview en `04-arquitectura-web.md`)
- [ ] Campos nuevos en `lib/service-intake.ts` (nombre del informe, precisión de hora, región); agregar tipo `select`
- [ ] Un informe aparece como `PENDIENTE` cuando la reserva queda pagada
- [ ] Pipeline por pasos (datos → carta → secciones), uno por petición
- **Terminado cuando:** una reserva pagada en sandbox genera su borrador paso a paso.

## Fase 6 · Panel admin `/admin/informes` (3–4 días)
- [ ] Lista de informes con estado
- [ ] Detalle con: datos de entrada y conversión (coordenadas, zona horaria, UTC), carta (rueda, planetas,
      casas, aspectos), secciones editables con botón de regenerar, avisos de validación, vista previa del PDF
- [ ] Descargar PDF y "marcar como entregado" (reserva → `COMPLETED`)
- **Terminado cuando:** Beto puede revisar a detalle, ajustar, descargar y marcar como entregado desde el panel.

## Fase 7 · Lanzamiento
- [ ] Licencia resuelta
- [ ] Borrar la ruta temporal `/api/astro/probe`
- [ ] Actualizar `REPORT_DELIVERY_TEXT` para carta astral si cambia el plazo prometido
- [ ] Probar con 5 clientes reales antes de anunciarlo
- [ ] Ideas siguientes: aviso por correo de "tu informe está listo", revolución solar, sinastría, mini-carta gratis para TikTok LIVE
