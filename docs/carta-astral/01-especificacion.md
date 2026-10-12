# 01 · Especificación

## Alcance v1
Solo **carta natal** en español. Tránsitos, revolución solar y sinastría
(compatibilidad de pareja) quedan para versiones siguientes como servicios aparte.

## Datos de entrada

Hoy `lib/service-intake.ts` pide: fecha, hora, ciudad y país. Se recomienda
agregar:

| Campo nuevo | Tipo | Por qué |
| --- | --- | --- |
| `nombreInforme` | text | Nombre que va en la portada (puede diferir del de la cuenta) |
| `precisionHora` | select: exacta / aproximada / desconocida | 4 min de error ≈ 1° de Ascendente; cambia qué secciones se incluyen |
| `regionNacimiento` | text (opcional) | Desambiguar ciudades homónimas (San José, Santa Rosa…) |

> `IntakeFieldType` hoy solo admite `text | date | time`; hará falta añadir `select`.

Reglas:
- Hora **desconocida** → carta solar a mediodía: sin casas ni Ascendente, y el
  informe lo explica.
- Hora **aproximada** → informe completo con aviso en casas y Ascendente.

## Fuentes de información

| Pieza | Herramienta | Para qué |
| --- | --- | --- |
| Efemérides | [Swiss Ephemeris](https://www.astro.com/swisseph/swephinfo_e.htm) (Astrodienst) | Posiciones planetarias; basada en JPL DE441 de la NASA, precisión ~0,001" |
| Motor de cálculo | Ver opciones en `04-arquitectura-web.md` | Planetas, casas, aspectos, rueda |
| Coordenadas | Nominatim (OpenStreetMap), sin cuenta (decidido en la Fase 1; GeoNames queda como alternativa) | Ciudad → lat/lon |
| Zona horaria | `tz-lookup` (coordenadas → zona IANA) + `date-fns-tz` (hora local → UTC con las reglas históricas) | Hora local → UTC con horarios de verano históricos |
| Textos | Base propia en JSON + API de Claude | Interpretaciones |
| PDF | HTML/CSS → PDF (ver arquitectura) | Informe con marca |

**Zonas horarias:** nunca usar un offset fijo. Colombia, por ejemplo, tuvo horario
de verano entre 1992 y 1993; muchos países han cambiado de zona varias veces.

## Configuración astrológica por defecto (confirmar)
- Zodíaco tropical
- Casas Placidus (alternativa: Signos Enteros; Placidus falla en latitudes extremas > 66°)
- Nodos verdaderos
- Puntos: Sol, Luna, Mercurio, Venus, Marte, Júpiter, Saturno, Urano, Neptuno,
  Plutón, Quirón, Nodo Norte/Sur, Ascendente, Medio Cielo
- Aspectos mayores con orbes: conjunción 8°, oposición 8°, trígono 7°,
  cuadratura 7°, sextil 5° (luminares +2°)

## Verificación de exactitud
Cartas de referencia en `tests/` comparadas contra astro.com: tolerancia ±0,1° en
planetas y ±0,5° en cúspides. Incluir al menos: una persona nacida en Bogotá en
1992–1993 (horario de verano), una del hemisferio sur, una con hora desconocida.

## Licencias (importante para vender) — DECISIÓN PENDIENTE
Motor elegido en la Fase 0: `sweph`. Según su propio README, desde la versión 2.10.1 se
distribuye bajo **AGPL-3.0**, y solo se puede usar bajo LGPL-3.0 si se tiene la
**licencia profesional** de Swiss Ephemeris (Astrodienst). Como esta web es un servicio
público, hay que elegir **antes de lanzar**:
1. Publicar el código bajo AGPL. Este repo ya es público, así que es la opción más barata,
   pero implica declarar la licencia (archivo `LICENSE`) y que **todo el código de la web**
   quede disponible bajo esos términos; conviene revisar si eso es aceptable.
2. Comprar la licencia profesional de Swiss Ephemeris.
3. Usar una API externa de pago (ej. Astrologer API, motor Kerykeion) — sin
   obligación de abrir el código, pero con costo por informe.

No es asesoría legal; revisarlo con alguien que sepa de licencias antes del lanzamiento.

## Privacidad
El repo es **público**: nunca subir datos reales de clientes, PDFs generados ni
cartas de prueba de personas reales. Las cartas de referencia usan personas
públicas o datos inventados.

Reglas adicionales (acordadas el 2026-10-12):
- Los datos de nacimiento y las cartas calculadas viven solo en la base de datos privada.
- **El PDF no se guarda** en Vercel Blob ni en ningún otro almacenamiento: se genera al
  momento de descargarlo desde el panel admin.
- A la IA solo se le envían posiciones ya calculadas (ej. "Sol en Leo, casa 5"); nunca el
  nombre, el correo ni el lugar exacto de nacimiento.
- El panel `/admin/informes` y la descarga del PDF solo funcionan con usuario `ADMIN`.

## Riesgos
- Hora mal dada → Ascendente errado. Mitigación: campo de precisión + aviso.
- Ciudades homónimas → región opcional + confirmación cuando haya varios resultados.
- Textos genéricos o repetidos → base propia + IA que combine factores.
- Costo de IA por informe → medir en la Fase 3 y fijar tope.
- Tiempo límite de funciones en Vercel → generación por pasos cortos, uno por clic de Beto (ver arquitectura).
