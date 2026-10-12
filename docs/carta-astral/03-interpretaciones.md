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
