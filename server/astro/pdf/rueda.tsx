import { Circle, G, Line, Path, Svg, Text } from "@react-pdf/renderer";
import { ELEMENTO_DE_SIGNO, SIGNOS } from "@/lib/astro/config";
import { anguloRueda, normalizar, puntoPolar, sectorAnular, separarGlifos } from "@/lib/astro/rueda";
import { COLOR_ASPECTO, COLOR_ELEMENTO, SIMBOLO_PUNTO, SIMBOLO_SIGNO } from "@/lib/astro/simbolos";
import type { CartaNatal, Punto } from "@/lib/astro/types";
import { COLOR, FUENTE } from "./estilos";

/**
 * Rueda de la carta natal, dibujada con SVG vectorial (nítida a cualquier tamaño). El
 * Ascendente va a la izquierda y el zodíaco avanza en sentido antihorario. Sin hora de
 * nacimiento no hay Ascendente ni casas: se dibuja solo el zodíaco con los planetas.
 */

const LADO = 520;
const C = LADO / 2;
const R = {
  exterior: 238,
  signos: 198,
  glifoSigno: 218,
  glifoPlaneta: 172,
  gradoPlaneta: 150,
  casas: 128,
  numeroCasa: 117,
  aspectos: 106,
  etiquetaAngulo: 252,
} as const;

const PUNTOS_EN_RUEDA: readonly Punto[] = [
  "sol", "luna", "mercurio", "venus", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton", "quiron", "nodoNorte",
];

export function Rueda({ carta, tamano = 440 }: { carta: CartaNatal; tamano?: number }) {
  const asc = carta.puntos.find((p) => p.punto === "ascendente");
  const horaConocida = Boolean(asc) && carta.casas.length === 12;
  const base = asc?.longitud ?? 0;
  const ang = (longitud: number) => anguloRueda(longitud, base);

  const planetas = PUNTOS_EN_RUEDA.map((id) => carta.puntos.find((p) => p.punto === id)).filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );
  const separadas = separarGlifos(planetas.map((p) => p.longitud), 8.5);

  const marcasGrado = Array.from({ length: 360 }, (_, i) => i).map((g) => {
    const largo = g % 10 === 0 ? 6 : g % 5 === 0 ? 4.5 : 2.5;
    const a = ang(g);
    const desde = puntoPolar(C, C, R.signos, a);
    const hasta = puntoPolar(C, C, R.signos - largo, a);
    return { g, desde, hasta };
  });

  return (
    <Svg viewBox={`0 0 ${LADO} ${LADO}`} width={tamano} height={tamano}>
      <Circle cx={C} cy={C} r={R.exterior} fill="#fffdf8" stroke={COLOR.oroProfundo} strokeWidth={1.4} />

      {/* Anillo de signos, teñido por elemento */}
      {SIGNOS.map((signo, i) => {
        const a0 = ang(i * 30);
        return (
          <G key={signo}>
            <Path
              d={sectorAnular(C, C, R.signos, R.exterior, a0, a0 + 30)}
              fill={COLOR_ELEMENTO[ELEMENTO_DE_SIGNO[signo]]}
              fillOpacity={0.13}
              stroke={COLOR.linea}
              strokeWidth={0.6}
            />
            {(() => {
              const p = puntoPolar(C, C, R.glifoSigno, a0 + 15);
              return (
                <Text
                  x={p.x}
                  y={p.y + 5.2}
                  textAnchor="middle"
                  style={{ fontFamily: FUENTE.simbolos, fontSize: 15 }}
                  fill={COLOR_ELEMENTO[ELEMENTO_DE_SIGNO[signo]]}
                >
                  {SIMBOLO_SIGNO[signo]}
                </Text>
              );
            })()}
          </G>
        );
      })}

      {marcasGrado.map(({ g, desde, hasta }) => (
        <Line key={g} x1={desde.x} y1={desde.y} x2={hasta.x} y2={hasta.y} stroke={COLOR.cenizaOscura} strokeWidth={0.35} />
      ))}

      <Circle cx={C} cy={C} r={R.signos} fill="none" stroke={COLOR.cenizaOscura} strokeWidth={0.8} />
      <Circle cx={C} cy={C} r={R.casas} fill="none" stroke={COLOR.linea} strokeWidth={0.6} />
      <Circle cx={C} cy={C} r={R.aspectos} fill="#fffdf8" stroke={COLOR.linea} strokeWidth={0.8} />

      {/* Casas: cúspides y numeración (solo con hora conocida) */}
      {horaConocida &&
        carta.casas.map((casa, i) => {
          const esAngulo = i === 0 || i === 9;
          const a = ang(casa.longitud);
          const desde = puntoPolar(C, C, R.aspectos, a);
          const hasta = puntoPolar(C, C, esAngulo ? R.exterior : R.signos, a);
          const siguiente = carta.casas[(i + 1) % 12];
          const mitad = a + normalizar(siguiente.longitud - casa.longitud) / 2;
          const numero = puntoPolar(C, C, R.numeroCasa, mitad);
          return (
            <G key={casa.casa}>
              <Line
                x1={desde.x}
                y1={desde.y}
                x2={hasta.x}
                y2={hasta.y}
                stroke={esAngulo ? COLOR.tinta : COLOR.ceniza}
                strokeWidth={esAngulo ? 1.4 : 0.6}
              />
              <Text
                x={numero.x}
                y={numero.y + 2.6}
                textAnchor="middle"
                style={{ fontFamily: FUENTE.etiqueta, fontSize: 7.5 }}
                fill={COLOR.cenizaOscura}
              >
                {String(casa.casa)}
              </Text>
            </G>
          );
        })}

      {/* Etiquetas de los ángulos, fuera del círculo */}
      {horaConocida &&
        [
          { etiqueta: "AC", longitud: carta.casas[0].longitud },
          { etiqueta: "MC", longitud: carta.casas[9].longitud },
        ].map(({ etiqueta, longitud }) => {
          const p = puntoPolar(C, C, R.etiquetaAngulo, ang(longitud));
          return (
            <Text
              key={etiqueta}
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              style={{ fontFamily: FUENTE.etiqueta, fontSize: 8, fontWeight: 700 }}
              fill={COLOR.tinta}
            >
              {etiqueta}
            </Text>
          );
        })}

      {/* Aspectos: líneas entre los puntos, sobre el círculo interior */}
      {carta.aspectos
        .filter((a) => a.tipo !== "conjuncion")
        .map((a, i) => {
          const pa = carta.puntos.find((p) => p.punto === a.a);
          const pb = carta.puntos.find((p) => p.punto === a.b);
          if (!pa || !pb) return null;
          const d = puntoPolar(C, C, R.aspectos, ang(pa.longitud));
          const h = puntoPolar(C, C, R.aspectos, ang(pb.longitud));
          return (
            <Line
              key={`${a.a}-${a.b}-${i}`}
              x1={d.x}
              y1={d.y}
              x2={h.x}
              y2={h.y}
              stroke={COLOR_ASPECTO[a.tipo]}
              strokeWidth={0.9}
              strokeOpacity={Math.max(0.35, 1 - a.orbe / 9)}
            />
          );
        })}

      {/* Planetas: marca en la posición exacta + glifo y grado (separados para que no se encimen) */}
      {planetas.map((p, i) => {
        const real = ang(p.longitud);
        const visible = ang(separadas[i]);
        const marcaDesde = puntoPolar(C, C, R.signos, real);
        const marcaHasta = puntoPolar(C, C, R.signos - 9, real);
        const glifo = puntoPolar(C, C, R.glifoPlaneta, visible);
        const grado = puntoPolar(C, C, R.gradoPlaneta, visible);
        const luminar = p.punto === "sol" || p.punto === "luna";
        return (
          <G key={p.punto}>
            <Line x1={marcaDesde.x} y1={marcaDesde.y} x2={marcaHasta.x} y2={marcaHasta.y} stroke={COLOR.tinta} strokeWidth={1} />
            <Text
              x={glifo.x}
              y={glifo.y + 5.5}
              textAnchor="middle"
              style={{ fontFamily: FUENTE.simbolos, fontSize: 16 }}
              fill={luminar ? COLOR.oroProfundo : COLOR.tinta}
            >
              {SIMBOLO_PUNTO[p.punto]}
            </Text>
            <Text
              x={grado.x}
              y={grado.y + 2.6}
              textAnchor="middle"
              style={{ fontFamily: FUENTE.etiqueta, fontSize: 7.2 }}
              fill={COLOR.tintaSuave}
            >
              {`${Math.floor(p.grado)}°${p.retrogrado ? "R" : ""}`}
            </Text>
          </G>
        );
      })}

      {!horaConocida && (
        <Text x={C} y={C + 3} textAnchor="middle" style={{ fontFamily: FUENTE.etiqueta, fontSize: 8 }} fill={COLOR.ceniza}>
          SIN HORA DE NACIMIENTO
        </Text>
      )}
    </Svg>
  );
}
