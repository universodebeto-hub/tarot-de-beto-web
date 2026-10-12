# 03 · Interpretaciones

Modelo híbrido: **base de textos propia** (la voz de la marca, revisable por
Beto) + **IA que redacta** combinando esos textos con los datos exactos de la
carta. La IA nunca calcula nada.

## Por qué híbrido
- Solo textos fijos → informes que suenan a plantilla y se repiten entre clientes.
- Solo IA → riesgo de inventar posiciones y de perder la voz de la marca.
- Híbrido → la IA recibe la carta en JSON + los textos base de cada factor y los
  integra en prosa fluida, con la voz definida.

## Base de textos (JSON, en `data/astro/textos/`)

| Archivo | Entradas | Total aprox. |
| --- | --- | --- |
| `planeta-en-signo.json` | 12 puntos × 12 signos | 144 |
| `planeta-en-casa.json` | 12 puntos × 12 casas | 144 |
| `ascendente.json` | 12 signos | 12 |
| `cuspide-casa.json` | 12 casas × 12 signos | 144 |
| `aspectos.json` | pares de planetas × 5 aspectos | ~250 |
| `elementos-modalidades.json` | exceso/falta de cada uno | ~14 |
| `fijos.json` | intro, cómo leer, cierre, avisos | ~10 |

Cada entrada: 80–150 palabras. Se pueden generar con IA en lote y luego Beto
las revisa y ajusta (es la parte que da identidad al producto).

Ejemplo de entrada:

```json
{
  "sol-aries": {
    "titulo": "Sol en Aries",
    "esencia": "Naciste para iniciar...",
    "luz": ["iniciativa", "valentía", "franqueza"],
    "sombra": ["impaciencia", "impulsividad"],
    "consejo": "..."
  }
}
```

## Uso de la IA (API de Claude)
- Una llamada por sección (no una sola para todo): más control y reintentos baratos.
- Entrada por sección: JSON de la carta (solo lo relevante a esa sección) + textos
  base de los factores involucrados + guía de estilo.
- Salida: Markdown/HTML simple con subtítulos.
- Prompt de sistema fijo con: tono, reglas de `02-contenido-informe.md`,
  prohibición de añadir posiciones que no estén en el JSON.
- Validación automática: el texto no puede mencionar un signo/casa distinto al
  del JSON para ese planeta (chequeo simple por regex).
- Guardar el texto generado por sección para poder regenerar solo una.
- Clave en `ANTHROPIC_API_KEY` (añadir a `.env.example`).

## Costo
Medir tokens por informe en la Fase 3 y fijar un tope. Usar caché de prompt
para la guía de estilo y los textos fijos, que se repiten en cada llamada.

## Cómo quedó implementado (Fase 3)
- `server/astro/interpret.ts` — 8 secciones (`SECCIONES`), una llamada por sección. `construirPeticion()` es una
  función pura que arma exactamente lo que ve la IA, así se puede revisar y probar.
- Privacidad: a la IA solo le llegan posiciones calculadas (signo, grado, casa, retrogradación, aspectos). Nunca nombre,
  fecha, hora, lugar, zona horaria ni coordenadas.
- Textos base: por ahora solo Sol, Luna y Ascendente (`data/astro/textos/`, ver Fase 2). Para el resto la IA redacta
  solo a partir de los datos; los archivos de la lista de arriba se irán agregando.
- `server/astro/validate.ts` — la validación anti-invento es por patrones de frase ("Venus en Libra", "Marte en la
  casa 4", "casa 7 en Piscis", "Mercurio retrógrado") y no entiende todo lo que se pueda escribir: atrapa errores
  evidentes y los muestra como avisos en el panel, no los bloquea ni garantiza que no haya otros.
- Modelo: `claude-opus-5-5` por defecto, esfuerzo medio. Se cambia con `ASTRO_MODEL` / `ASTRO_EFFORT`.
  La API rechaza `temperature`, `top_p`, `top_k` y `budget_tokens` en este modelo, y el razonamiento no se puede desactivar: por eso el cliente no envía ninguno de esos parámetros.
