# 05 · Plan por fases

Cada fase termina con algo que se puede probar. Marcar `[x]` al completar.

## Fase 0 · Decidir el motor (1–2 días)
- [ ] Probar opción A (Swiss Ephemeris en Node) en local y en una preview de Vercel
- [ ] Si falla, probar opción C (API externa) y anotar costo por informe
- [ ] Confirmar configuración: tropical, Placidus, puntos y orbes (`01-especificacion.md`)
- [ ] Decidir el camino de licencia
- **Terminado cuando:** un endpoint de prueba devuelve el Sol de una fecha conocida correcto al 0,1°.

## Fase 1 · Cálculo (2–3 días)
- [ ] `server/astro/geocode.ts` con zona horaria histórica
- [ ] `server/astro/engine.ts` devolviendo `CartaNatal` completa
- [ ] Casos: hora exacta, aproximada, desconocida
- [ ] Pruebas con 5 cartas de referencia vs astro.com (vitest)
- **Terminado cuando:** las 5 cartas cuadran dentro de la tolerancia.

## Fase 2 · Base de textos (paralelo, la lleva Beto)
- [ ] Generar borradores de `data/astro/textos/*.json` con IA
- [ ] Beto revisa y ajusta la voz (empezar por Sol, Luna, Ascendente)
- **Terminado cuando:** existen las 300 entradas principales revisadas.

## Fase 3 · Redacción con IA (2–3 días)
- [ ] `server/astro/interpret.ts`, una llamada por sección
- [ ] Validación anti-invento (signo/casa coinciden con el JSON)
- [ ] Medir tokens y costo por informe
- **Terminado cuando:** 3 informes de prueba leídos por Beto sin errores de datos.

## Fase 4 · PDF (2–3 días)
- [ ] Rueda SVG con colores de la marca
- [ ] Plantilla con portada, tablas, secciones y pie de página
- [ ] Guardar en Vercel Blob
- **Terminado cuando:** el PDF se ve bien en celular y computador.

## Fase 5 · Integración con reservas (2–3 días)
- [ ] Modelo `AstroReport` + migración
- [ ] Campos nuevos en `lib/service-intake.ts` (nombre del informe, precisión de hora)
- [ ] Crear informe al pagar; cron que procesa pendientes
- [ ] Correo de entrega con plantilla en `server/notifications/templates.ts`
- **Terminado cuando:** una reserva pagada en sandbox recibe su PDF por correo.

## Fase 6 · Panel admin (1–2 días)
- [ ] Lista de informes con estado
- [ ] Ver, aprobar, regenerar una sección, reenviar
- **Terminado cuando:** Beto puede revisar y aprobar desde el panel.

## Fase 7 · Lanzamiento
- [ ] Licencia resuelta
- [ ] Actualizar `REPORT_DELIVERY_TEXT` para carta astral (ej. "en minutos")
- [ ] Probar con 5 clientes reales antes de anunciarlo
- [ ] Ideas siguientes: revolución solar, sinastría, mini-carta gratis para TikTok LIVE
