# 05 · Plan por fases

Cada fase termina con algo que se puede probar. Marcar `[x]` al completar. **Al cerrar cada fase
se deja un "Resumen" de lo que incluye**, para saber qué se avanzó.

## Fase 0 · Decidir el motor (1–2 días)
- [x] Probar opción A (Swiss Ephemeris en Node) en local — `scripts/astro-probe.mjs`
- [x] Verificar que el binario de Linux viaja con la función (`outputFileTracingIncludes`)
- [ ] Abrir `<url de la preview>/api/astro/probe` (con sesión de Vercel) y comprobar `plataforma: linux` y `ok: true`
- [ ] Si falla en Vercel, probar opción C (API externa) y anotar costo por informe
- [x] Confirmar configuración: tropical, Placidus, puntos y orbes (`01-especificacion.md`) — aprobada el 2026-10-12
- [x] Decidir el camino de licencia — decisión 2026-10-12: **AGPL** (publicar el código). Falta agregar el archivo `LICENSE` y revisarlo con alguien que sepa de licencias (Fase 7)
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

## Fase 1 · Cálculo — HECHA en código (2026-10-12); falta tu comparación manual
- [x] `server/astro/geocode.ts` (ciudad/país → coordenadas) y zona horaria por coordenadas
- [x] `lib/astro/time.ts`: hora local → UTC con husos históricos y avisos
- [x] `server/astro/engine.ts` devolviendo `CartaNatal` completa
- [x] Agregar `seas_18.se1` para Quirón (`data/astro/ephe/`)
- [x] Casos: hora exacta, aproximada, desconocida (y latitudes extremas)
- [x] Pruebas automáticas (vitest) contra cálculos independientes — `tests/server/astro-*.test.ts`, `tests/lib/astro-*.test.ts`
- [ ] **Beto compara las 5 cartas de `06-cartas-de-prueba.md` contra astro.com** (último control antes de lanzar)
- **Terminado cuando:** las 5 cartas cuadran contra astro.com dentro de la tolerancia (±0°06' planetas, ±0°30' cúspides).

**Resumen Fase 1 (qué incluye):**
- **Geocodificación:** Nominatim (OpenStreetMap), sin cuenta ni clave, con una sola consulta por informe. Devuelve el mejor lugar y las alternativas, y avisa si hay ciudades homónimas a más de 50 km. La zona horaria sale de las coordenadas con `tz-lookup` (sin internet).
- **Hora de nacimiento a UTC** con las reglas históricas de cada zona (Colombia con verano 1992–93, Venezuela en UTC−4:30 de 2007 a 2016, etc.). Avisa si la hora no existió o se repitió por un cambio de horario, y si el año es anterior a 1930.
- **Carta completa:** Sol, Luna, Mercurio a Plutón, Quirón, Nodo Norte y Sur (verdadero), Ascendente y Medio Cielo, 12 casas Placidus, casa de cada punto, retrogradación, aspectos mayores con orbes y si son aplicativos, balance de elementos y modalidades, y fase lunar.
- **Tres casos de hora:** exacta (carta completa); aproximada (completa + aviso sobre Ascendente y casas); desconocida (carta solar a mediodía, sin Ascendente ni casas, con aviso, y aviso extra si la Luna cambia de signo ese día).
- **Latitudes extremas:** sobre 66° Placidus no existe, se usan Signos Enteros con aviso.
- **Exactitud comprobada:** 111 pruebas automáticas pasan (83 nuevas). Los planetas coinciden con un motor independiente dentro de 0,02° y el Ascendente/Medio Cielo con la fórmula astronómica dentro de 0,01°. Se comprobó además que las pruebas fallan si se adelanta el reloj una hora.
- **Todo con datos ficticios**, nunca de clientes.

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
- [ ] Licencia resuelta: agregar archivo `LICENSE` (AGPL-3.0) y revisarlo con alguien que sepa de licencias
- [ ] Borrar la ruta temporal `/api/astro/probe`
- [ ] Actualizar `REPORT_DELIVERY_TEXT` para carta astral si cambia el plazo prometido
- [ ] Probar con 5 clientes reales antes de anunciarlo
- [ ] Ideas siguientes: aviso por correo de "tu informe está listo", revolución solar, sinastría, mini-carta gratis para TikTok LIVE
