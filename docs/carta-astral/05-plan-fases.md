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

## Fase 2 · Base de textos — borradores HECHOS (2026-10-12); falta la revisión de Beto
- [x] Borradores de `data/astro/textos/planeta-en-signo.json` (Sol y Luna × 12 signos) y `ascendente.json` (12 signos): 36 textos
- [ ] **Beto revisa y ajusta la voz** de los 36 textos (cada archivo dice `"estado": "borrador"`; al terminar, cambiar a `"revisado"`). La IA redacta el resto de los planetas con su voz y se va puliendo después
- **Terminado cuando:** Sol, Luna y Ascendente (los 12 signos de cada uno) están revisados por Beto.

**Resumen Fase 2 (qué incluye):**
- 36 textos base de 80–110 palabras cada uno, con la estructura del plan: título, esencia, luz, sombra y consejo.
- Voz: español neutro, "tú", cálido y de autoconocimiento; los retos se presentan como oportunidades de crecimiento; sin predicciones de salud, muerte, embarazos ni dinero.
- Cargados por `server/astro/textos.ts` (con tipos). La tríada y la síntesis del informe los usan como voz de la marca.
- **Cómo revisarlos:** abrir los dos archivos de `data/astro/textos/`, editar el texto de cada entrada directamente y avisar. Los textos de tipo "esencia" son los que más pesan en el informe.

## Fase 3 · Redacción con IA — HECHA en código (2026-10-12); falta probar con la clave real
- [x] `server/astro/interpret.ts`, una llamada por sección (8 secciones)
- [x] La IA recibe solo posiciones calculadas (nunca nombre, fecha, hora, lugar ni coordenadas) — verificado con pruebas
- [x] `server/astro/validate.ts`: avisos anti-invento (signo, casa, cúspide y retrogradación mencionados deben coincidir con la carta; temas sensibles)
- [ ] **Medir tokens y costo por informe** (necesita `ANTHROPIC_API_KEY`; comando abajo)
- [ ] **3 informes de prueba** (con datos inventados) leídos por Beto sin errores de datos
- **Terminado cuando:** 3 informes de prueba leídos por Beto sin errores de datos.

**Resumen Fase 3 (qué incluye):**
- **8 secciones con IA:** Tu Gran Tríada, Balance de energías, Planetas personales, Planetas sociales y generacionales, Las 12 casas, Aspectos principales, Nodos lunares y Quirón, Síntesis y consejos (esta cierra con 5 consejos). Con hora desconocida se omiten las casas y la tríada pasa a Sol + Luna.
- **Qué recibe la IA por sección:** solo los datos de esa sección (posiciones ya calculadas) y los textos base de los signos que corresponden. Nada personal. Hay pruebas que fallan si alguna vez se filtra el nombre, la fecha, la hora, la ciudad, la zona horaria o las coordenadas.
- **Reglas fijas** (prompt de sistema, con caché): usar exclusivamente los datos, no inventar posiciones, español neutro en "tú", retos como oportunidades, sin predicciones de salud/muerte/embarazos/dinero, aviso en una frase si la hora es aproximada o desconocida.
- **Validación después de redactar:** avisa si el texto dice "Venus en Géminis" y la carta tiene Venus en Libra, o la casa, la cúspide o la retrogradación equivocadas; y marca palabras sensibles (muerte, enfermedad, embarazo, fortuna...) para revisión. Son avisos para el panel, no bloquean.
- **Regenerar una sola sección** es una llamada (`redactarSeccion`); el informe completo es `redactarInforme`.
- **Modelo y costo:** por defecto `claude-opus-5-5` con esfuerzo medio (configurable con `ASTRO_MODEL` y `ASTRO_EFFORT`). Registra tokens y estima el costo en dólares por informe.
- **Pruebas:** 32 nuevas con una IA simulada (sin gastar nada); además se comprobó que fallan si se filtra la ciudad o se desactiva la validación. El cliente real se prueba con el SDK simulado: parámetros correctos, manejo de rechazo, texto cortado y respuesta vacía.

**Cómo medir el costo real (cuando tengas la clave):**
```
ANTHROPIC_API_KEY=tu-clave ASTRO_LIVE_AI=1 npx vitest run tests/server/astro-interpret.live.test.ts
```
Redacta un informe completo de una persona ficticia, imprime tokens y costo estimado, y deja el texto en `informe-de-prueba.md` (ignorado por git) para que lo leas.

## Fase 4 · PDF — HECHA en código (2026-10-12); falta tu visto bueno del diseño
- [x] Portada oscura con el logo completo, nombre, fecha/lugar y Sol · Luna · Ascendente
- [x] Encabezado en cada página (emblema + "TAROT DE BETO" + nombre del cliente) y pie con "Página X de Y"
- [x] Rueda natal en SVG vectorial a página completa (colores de la marca, aspectos, casas, retrógrados)
- [x] Tabla técnica (planetas, casas, aspectos), cómo leer el informe + leyenda, balance de elementos/modalidades
- [x] Las 8 secciones, cierre con firma (imagen o letra manuscrita), aviso, servicios y datos de contacto
- [x] Se genera al momento de descargarlo; **no se guarda en ningún almacenamiento**
- [x] Pruebas: PDF válido, portada, sin páginas en blanco, encabezado/pie en todas, firma, variante sin hora
- Firma: por ahora el nombre en letra manuscrita; la imagen real se sube en privado desde el panel (Fase 6).
- Tipografías con licencia abierta en `data/astro/fonts/` (con sus LICENSE).
- **Terminado cuando:** Beto aprueba cómo se ve el PDF de muestra.

## Fase 5 · Integración con reservas — HECHA en código (2026-10-12); falta probarla con un pago real en sandbox
- [x] Modelo `AstroReport` + migración `20261012000000_add_astro_report` (**solo agrega una tabla**, no toca nada existente; ya aplicada a la base de pruebas)
- [x] Formulario de reserva (web): campos nuevos opcionales —nombre para el informe, "¿qué tan segura es la hora?" (nuevo tipo `select`), estado/departamento—; la hora deja de ser obligatoria si el cliente no la sabe
- [x] Reservas viejas y la app móvil siguen funcionando: los campos nuevos son opcionales y, sin precisión, se asume "exacta"
- [x] Un informe aparece como `PENDIENTE` al abrir el panel si la reserva `carta-astral` está pagada (`asegurarInformesPagados`, sin duplicar; no se toca el flujo de pago)
- [x] Pipeline por pasos (`avanzarInforme`): carta (datos → ubicación → cálculo) y luego una sección por paso → `REDACTADO`; un fallo deja el estado intacto y guarda el error para reintentar ese mismo paso
- [x] Se guardan en la base privada: datos interpretados, lugar, carta, secciones, tokens y costo
- [x] Pruebas: creación sin duplicar, avance paso a paso, la IA nunca recibe datos personales, datos inválidos, reintento tras fallo de la IA
- Pendiente de la app móvil (repo aparte): mostrar los campos nuevos en su formulario (hasta entonces funciona sin ellos).
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
