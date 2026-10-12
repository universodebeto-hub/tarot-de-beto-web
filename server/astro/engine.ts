import "server-only";
import path from "node:path";
import sweph from "sweph";
import { LATITUD_MAXIMA_PLACIDUS } from "@/lib/astro/config";
import { horaLocalAUtc, diaSiguiente } from "@/lib/astro/time";
import type { CartaNatal, Cuspide, DatosNacimiento, Lugar, Punto, PosicionPunto } from "@/lib/astro/types";
import {
  calcularAspectos,
  calcularBalance,
  casaDeLongitud,
  faseLunarDeElongacion,
  gradoEnSigno,
  normalizar360,
  signoDeLongitud,
  type PuntoConVelocidad,
} from "@/lib/astro/utils";

/**
 * Motor de cálculo de la carta natal. Interfaz única del resto del sistema:
 * `calcularCarta(datos, lugar) → CartaNatal` (tipos en lib/astro/types.ts). Es una
 * función pura y determinista (no usa red ni IA); la ciudad ya viene geocodificada.
 *
 * Usa Swiss Ephemeris (`sweph`). Sin archivos de efemérides calcula Sol–Plutón con el
 * modo interno (Moshier, precisión de sobra para una carta); Quirón necesita
 * `data/astro/ephe/seas_18.se1` (archivo oficial de Astrodienst, ver docs/carta-astral/).
 */

const C = sweph.constants;
const FLAGS = C.SEFLG_SWIEPH | C.SEFLG_SPEED;
const RUTA_EFEMERIDES = path.join(process.cwd(), "data", "astro", "ephe");
/** Velocidad aproximada del Ascendente y el Medio Cielo (una vuelta por día sidéreo). */
const VELOCIDAD_ANGULOS = 360.9856;

const CUERPOS: ReadonlyArray<readonly [Punto, number]> = [
  ["sol", C.SE_SUN],
  ["luna", C.SE_MOON],
  ["mercurio", C.SE_MERCURY],
  ["venus", C.SE_VENUS],
  ["marte", C.SE_MARS],
  ["jupiter", C.SE_JUPITER],
  ["saturno", C.SE_SATURN],
  ["urano", C.SE_URANUS],
  ["neptuno", C.SE_NEPTUNE],
  ["pluton", C.SE_PLUTO],
  ["quiron", C.SE_CHIRON],
];

const SIN_RETROGRADO: ReadonlySet<Punto> = new Set(["sol", "luna", "ascendente", "medioCielo"]);

let efemeridesConfiguradas = false;
function configurarEfemerides(): void {
  if (efemeridesConfiguradas) return;
  sweph.set_ephe_path(RUTA_EFEMERIDES);
  efemeridesConfiguradas = true;
}

function diaJuliano(utc: Date): number {
  const hora = utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600;
  return sweph.julday(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), hora, C.SE_GREG_CAL);
}

/** Longitud y velocidad de un cuerpo. Un `flag` negativo es error real; los avisos de "usando Moshier" no lo son. */
function calcularCuerpo(jd: number, id: number): { longitud: number; velocidad: number } {
  const r = sweph.calc_ut(jd, id, FLAGS);
  if (r.flag < 0) throw new Error(`El motor astronómico falló (cuerpo ${id}): ${r.error}`);
  return { longitud: normalizar360(r.data[0]), velocidad: r.data[3] };
}

interface ResultadoCasas {
  sistema: "Placidus" | "Signos enteros";
  ascendente: number;
  medioCielo: number;
  cuspides: Cuspide[];
  advertencias: string[];
}

function calcularCasas(jd: number, lugar: Lugar): ResultadoCasas {
  const advertencias: string[] = [];
  let sistemaPedido: "P" | "W" = "P";

  if (Math.abs(lugar.lat) >= LATITUD_MAXIMA_PLACIDUS) {
    sistemaPedido = "W";
    advertencias.push(
      `Latitud ${lugar.lat.toFixed(2)}°: más allá de ${LATITUD_MAXIMA_PLACIDUS}° Placidus no se puede calcular, se usaron casas de Signos Enteros.`,
    );
  }

  let r = sweph.houses(jd, lugar.lat, lugar.lon, sistemaPedido);
  if (r.flag === C.ERR && sistemaPedido === "P") {
    sistemaPedido = "W";
    advertencias.push("Placidus no se pudo calcular para este lugar y fecha: se usaron casas de Signos Enteros.");
    r = sweph.houses(jd, lugar.lat, lugar.lon, "W");
  }

  const cuspides: Cuspide[] = r.data.houses.slice(0, 12).map((longitud, i) => ({
    casa: i + 1,
    signo: signoDeLongitud(longitud),
    grado: gradoEnSigno(longitud),
    longitud: normalizar360(longitud),
  }));

  return {
    sistema: sistemaPedido === "P" ? "Placidus" : "Signos enteros",
    ascendente: normalizar360(r.data.points[0]),
    medioCielo: normalizar360(r.data.points[1]),
    cuspides,
    advertencias,
  };
}

/** ¿La Luna cambia de signo durante el día local? Importa cuando la hora de nacimiento se desconoce. */
function lunaCambiaDeSigno(datos: DatosNacimiento, lugar: Lugar): boolean {
  const inicio = horaLocalAUtc(datos.fecha, "00:00", lugar.zonaHoraria).utc;
  const fin = horaLocalAUtc(diaSiguiente(datos.fecha), "00:00", lugar.zonaHoraria).utc;
  const a = calcularCuerpo(diaJuliano(inicio), C.SE_MOON).longitud;
  const b = calcularCuerpo(diaJuliano(fin), C.SE_MOON).longitud;
  return signoDeLongitud(a) !== signoDeLongitud(b);
}

export function calcularCarta(datos: DatosNacimiento, lugar: Lugar): CartaNatal {
  configurarEfemerides();

  const horaConocida = datos.precision !== "desconocida";
  const horaUsada = horaConocida ? datos.hora : "12:00";
  const conversion = horaLocalAUtc(datos.fecha, horaUsada, lugar.zonaHoraria);
  const advertencias = [...conversion.advertencias];
  const jd = diaJuliano(conversion.utc);

  if (datos.precision === "aproximada") {
    advertencias.push(
      "Hora de nacimiento aproximada: el Ascendente y las casas pueden estar desplazados (4 minutos de error equivalen a ~1° de Ascendente). El informe debe avisarlo.",
    );
  }
  if (!horaConocida) {
    advertencias.push(
      "Hora de nacimiento desconocida: carta solar calculada al mediodía, sin Ascendente ni casas. La Luna puede estar hasta ~6° corrida respecto a la hora real.",
    );
    if (lunaCambiaDeSigno(datos, lugar)) {
      advertencias.push("La Luna cambia de signo durante ese día: su signo es incierto sin la hora de nacimiento.");
    }
  }

  const velocidades = new Map<Punto, number>();
  const puntos: PosicionPunto[] = [];
  const agregar = (punto: Punto, longitud: number, velocidad: number, casa: (lon: number) => number | null) => {
    velocidades.set(punto, velocidad);
    puntos.push({
      punto,
      signo: signoDeLongitud(longitud),
      grado: gradoEnSigno(longitud),
      longitud,
      casa: casa(longitud),
      // El Sol, la Luna y los ángulos nunca se consideran retrógrados.
      retrogrado: !SIN_RETROGRADO.has(punto) && velocidad < 0,
    });
  };

  const casas = horaConocida ? calcularCasas(jd, lugar) : null;
  if (casas) advertencias.push(...casas.advertencias);
  const casaDe = (lon: number) => (casas ? casaDeLongitud(lon, casas.cuspides) : null);

  for (const [punto, id] of CUERPOS) {
    const { longitud, velocidad } = calcularCuerpo(jd, id);
    agregar(punto, longitud, velocidad, casaDe);
  }

  const nodo = calcularCuerpo(jd, C.SE_TRUE_NODE);
  agregar("nodoNorte", nodo.longitud, nodo.velocidad, casaDe);
  agregar("nodoSur", normalizar360(nodo.longitud + 180), nodo.velocidad, casaDe);

  if (casas) {
    agregar("ascendente", casas.ascendente, VELOCIDAD_ANGULOS, casaDe);
    agregar("medioCielo", casas.medioCielo, VELOCIDAD_ANGULOS, casaDe);
  }

  const paraAspectos: PuntoConVelocidad[] = puntos.map((p) => ({
    punto: p.punto,
    longitud: p.longitud,
    velocidad: velocidades.get(p.punto) ?? 0,
  }));

  const sol = puntos.find((p) => p.punto === "sol")!;
  const luna = puntos.find((p) => p.punto === "luna")!;

  return {
    datos,
    lugar,
    utc: conversion.utc.toISOString(),
    configuracion: {
      zodiaco: "tropical",
      sistemaCasas: casas ? casas.sistema : "ninguno (hora desconocida)",
      nodos: "verdadero",
    },
    puntos,
    casas: casas ? casas.cuspides : [],
    aspectos: calcularAspectos(paraAspectos),
    balance: calcularBalance(puntos),
    faseLunar: faseLunarDeElongacion(sol.longitud, luna.longitud),
    advertencias,
  };
}
