/**
 * Geometría de la rueda de la carta (funciones puras, sin dibujar nada).
 *
 * Convención: el Ascendente va a la izquierda (9 en punto) y el zodíaco avanza en sentido
 * antihorario. Los ángulos se miden en grados, 0° = derecha, creciendo hacia arriba
 * (como en matemáticas); la coordenada y de pantalla se invierte al convertir.
 */

export function normalizar(grados: number): number {
  return ((grados % 360) + 360) % 360;
}

/** Ángulo de la rueda para una longitud eclíptica, con el Ascendente a la izquierda (180°). */
export function anguloRueda(longitud: number, ascendente: number): number {
  return normalizar(180 + (longitud - ascendente));
}

export function puntoPolar(cx: number, cy: number, radio: number, anguloGrados: number): { x: number; y: number } {
  const a = (anguloGrados * Math.PI) / 180;
  return { x: cx + radio * Math.cos(a), y: cy - radio * Math.sin(a) };
}

const f = (n: number) => n.toFixed(2);

/** Sector anular (porción de anillo) entre dos radios y dos ángulos, de `inicio` a `fin` (fin > inicio, ≤ 180° de ancho). */
export function sectorAnular(cx: number, cy: number, rInterior: number, rExterior: number, inicio: number, fin: number): string {
  const a = puntoPolar(cx, cy, rExterior, inicio);
  const b = puntoPolar(cx, cy, rExterior, fin);
  const c = puntoPolar(cx, cy, rInterior, fin);
  const d = puntoPolar(cx, cy, rInterior, inicio);
  const grande = fin - inicio > 180 ? 1 : 0;
  return [
    `M ${f(a.x)} ${f(a.y)}`,
    `A ${f(rExterior)} ${f(rExterior)} 0 ${grande} 0 ${f(b.x)} ${f(b.y)}`,
    `L ${f(c.x)} ${f(c.y)}`,
    `A ${f(rInterior)} ${f(rInterior)} 0 ${grande} 1 ${f(d.x)} ${f(d.y)}`,
    "Z",
  ].join(" ");
}

/**
 * Separa los glifos de los planetas para que no se encimen: devuelve, en el mismo orden de
 * entrada, un ángulo ajustado por punto con al menos `separacionMinima` grados entre vecinos
 * (si caben). Mantiene el orden y mueve lo mínimo posible.
 */
export function separarGlifos(longitudes: readonly number[], separacionMinima = 8): number[] {
  const n = longitudes.length;
  if (n === 0) return [];
  if (n * separacionMinima > 360) throw new Error("No caben tantos glifos con esa separación mínima.");

  const orden = longitudes.map((_, i) => i).sort((a, b) => normalizar(longitudes[a]) - normalizar(longitudes[b]));
  // Posiciones sobre una línea continua: se desenrolla el círculo dejando los datos ordenados.
  const pos = orden.map((i) => normalizar(longitudes[i]));

  for (let pasada = 0; pasada < 200; pasada++) {
    let movido = false;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      const hueco = j === 0 ? pos[0] + 360 - pos[k] : pos[j] - pos[k];
      if (hueco < separacionMinima - 1e-9) {
        const falta = (separacionMinima - hueco) / 2;
        pos[k] -= falta;
        pos[j] += falta;
        movido = true;
      }
    }
    if (!movido) break;
  }

  const resultado = new Array<number>(n);
  orden.forEach((original, k) => {
    resultado[original] = normalizar(pos[k]);
  });
  return resultado;
}
