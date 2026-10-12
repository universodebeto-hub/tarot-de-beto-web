import { describe, it, expect } from "vitest";
import * as Astronomy from "astronomy-engine";
import { calcularCarta } from "@/server/astro/engine";
import { horaLocalAUtc, diaSiguiente } from "@/lib/astro/time";
import { normalizar360, casaDeLongitud } from "@/lib/astro/utils";
import type { DatosNacimiento, Lugar, Punto } from "@/lib/astro/types";

/**
 * Verificación de exactitud (Fase 1 del plan). Todas las personas son FICTICIAS:
 * el repo es público y nunca lleva datos reales de clientes.
 *
 * Sin acceso a astro.com desde los tests, cada resultado se cruza contra un
 * cálculo INDEPENDIENTE del motor (sweph):
 *  - Sol a Plutón y Luna: `astronomy-engine` (MIT), tolerancia 0,02° (el plan pedía 0,1°).
 *  - Ascendente y Medio Cielo: fórmula astronómica estándar con el tiempo sidéreo
 *    de `astronomy-engine`, tolerancia 0,01° (el plan pedía 0,5° en cúspides).
 * Además, antes de lanzar, Beto compara estas mismas cartas contra astro.com.
 */

const BOGOTA: Lugar = { nombreMostrado: "Bogotá", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" };
const BUENOS_AIRES: Lugar = {
  nombreMostrado: "Buenos Aires",
  lat: -34.6037,
  lon: -58.3816,
  zonaHoraria: "America/Argentina/Buenos_Aires",
};
const CARACAS: Lugar = { nombreMostrado: "Caracas", lat: 10.4806, lon: -66.9036, zonaHoraria: "America/Caracas" };
const MADRID: Lugar = { nombreMostrado: "Madrid", lat: 40.4168, lon: -3.7038, zonaHoraria: "Europe/Madrid" };
const SYDNEY: Lugar = { nombreMostrado: "Sídney", lat: -33.8688, lon: 151.2093, zonaHoraria: "Australia/Sydney" };
const TROMSO: Lugar = { nombreMostrado: "Tromsø", lat: 69.6492, lon: 18.9553, zonaHoraria: "Europe/Oslo" };
const UTC: Lugar = { nombreMostrado: "Greenwich", lat: 51.4779, lon: 0, zonaHoraria: "UTC" };

function datos(fecha: string, hora: string, lugar: Lugar, extra: Partial<DatosNacimiento> = {}): DatosNacimiento {
  return { nombre: "Persona de prueba", fecha, hora, precision: "exacta", ciudad: lugar.nombreMostrado, pais: "Prueba", ...extra };
}

const CASOS: ReadonlyArray<readonly [string, DatosNacimiento, Lugar]> = [
  ["Bogotá con horario de verano 1992", datos("1992-09-20", "14:45", BOGOTA), BOGOTA],
  ["Buenos Aires, hemisferio sur", datos("1985-03-02", "03:20", BUENOS_AIRES), BUENOS_AIRES],
  ["Caracas UTC−4:30 (2012)", datos("2012-06-01", "23:10", CARACAS), CARACAS],
  ["Madrid 1978", datos("1978-11-23", "07:05", MADRID), MADRID],
  ["Sídney, cruce de año", datos("1999-12-31", "23:55", SYDNEY), SYDNEY],
];

const CUERPOS_CONTROL: ReadonlyArray<readonly [Punto, Astronomy.Body]> = [
  ["sol", Astronomy.Body.Sun],
  ["luna", Astronomy.Body.Moon],
  ["mercurio", Astronomy.Body.Mercury],
  ["venus", Astronomy.Body.Venus],
  ["marte", Astronomy.Body.Mars],
  ["jupiter", Astronomy.Body.Jupiter],
  ["saturno", Astronomy.Body.Saturn],
  ["urano", Astronomy.Body.Uranus],
  ["neptuno", Astronomy.Body.Neptune],
  ["pluton", Astronomy.Body.Pluto],
];

/** Longitud eclíptica geocéntrica aparente, tropical (eclíptica verdadera de la fecha). */
function longitudDeControl(body: Astronomy.Body, fecha: Date): number {
  const rot = Astronomy.Rotation_EQJ_ECT(fecha);
  const ect = Astronomy.RotateVector(rot, Astronomy.GeoVector(body, fecha, true));
  return normalizar360(Astronomy.SphereFromVector(ect).lon);
}

function difGrados(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Ascendente y Medio Cielo por la fórmula estándar, a partir del tiempo sidéreo. */
function angulosDeControl(fecha: Date, lat: number, lon: number): { asc: number; mc: number } {
  const rad = Math.PI / 180;
  const ramc = normalizar360(Astronomy.SiderealTime(fecha) * 15 + lon) * rad;
  const eps = Astronomy.e_tilt(Astronomy.MakeTime(fecha)).tobl * rad;
  const mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / rad;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * rad) * Math.sin(eps))) / rad;
  return { asc: normalizar360(asc), mc: normalizar360(mc) };
}

const punto = (carta: ReturnType<typeof calcularCarta>, p: Punto) => carta.puntos.find((x) => x.punto === p)!;

describe.each(CASOS)("carta natal — %s", (_nombre, d, lugar) => {
  const carta = calcularCarta(d, lugar);
  const utc = new Date(carta.utc);

  it("convierte la hora local a UTC con las reglas históricas de la zona", () => {
    expect(carta.utc).toBe(horaLocalAUtc(d.fecha, d.hora, lugar.zonaHoraria).utc.toISOString());
  });

  it("Sol, Luna y planetas coinciden con el cálculo independiente (±0,02°)", () => {
    for (const [nombre, body] of CUERPOS_CONTROL) {
      expect(difGrados(punto(carta, nombre).longitud, longitudDeControl(body, utc)), nombre).toBeLessThan(0.02);
    }
  });

  it("Ascendente y Medio Cielo coinciden con la fórmula estándar (±0,01°)", () => {
    const esperado = angulosDeControl(utc, lugar.lat, lugar.lon);
    expect(difGrados(punto(carta, "ascendente").longitud, esperado.asc)).toBeLessThan(0.01);
    expect(difGrados(punto(carta, "medioCielo").longitud, esperado.mc)).toBeLessThan(0.01);
  });

  it("las casas Placidus son coherentes: 12 cúspides, la 1 es el Ascendente, la 10 el Medio Cielo, opuestas a 180°", () => {
    expect(carta.configuracion.sistemaCasas).toBe("Placidus");
    expect(carta.casas).toHaveLength(12);
    expect(carta.casas[0].longitud).toBeCloseTo(punto(carta, "ascendente").longitud, 6);
    expect(carta.casas[9].longitud).toBeCloseTo(punto(carta, "medioCielo").longitud, 6);
    for (let i = 0; i < 6; i++) {
      expect(difGrados(carta.casas[i].longitud, carta.casas[i + 6].longitud + 180), `casa ${i + 1}`).toBeLessThan(1e-6);
    }
  });

  it("cada punto tiene una casa 1–12 que coincide con sus cúspides", () => {
    for (const p of carta.puntos) {
      expect(p.casa).toBeGreaterThanOrEqual(1);
      expect(p.casa).toBeLessThanOrEqual(12);
      expect(p.casa).toBe(casaDeLongitud(p.longitud, carta.casas));
    }
  });

  it("incluye Quirón, nodos opuestos entre sí, balance completo y fase lunar", () => {
    const norte = punto(carta, "nodoNorte").longitud;
    expect(difGrados(punto(carta, "nodoSur").longitud, norte + 180)).toBeLessThan(1e-9);
    expect(punto(carta, "quiron")).toBeDefined();
    const total = Object.values(carta.balance.elementos).reduce((s, n) => s + n, 0);
    expect(total).toBe(11); // 10 planetas + Ascendente
    expect(typeof carta.faseLunar).toBe("string");
  });

  it("los aspectos son pares distintos, con orbe dentro del límite y nunca con el Nodo Sur", () => {
    expect(carta.aspectos.length).toBeGreaterThan(0);
    for (const a of carta.aspectos) {
      expect(a.a).not.toBe(a.b);
      expect(a.a).not.toBe("nodoSur");
      expect(a.b).not.toBe("nodoSur");
      expect(a.orbe).toBeLessThanOrEqual(10);
    }
  });
});

describe("hechos astronómicos conocidos", () => {
  it("Saturno estaba retrógrado en marzo de 2015 y el Sol/Luna nunca lo marcan", () => {
    const carta = calcularCarta(datos("2015-03-20", "09:45", UTC), UTC);
    expect(punto(carta, "saturno").retrogrado).toBe(true);
    expect(punto(carta, "sol").retrogrado).toBe(false);
    expect(punto(carta, "luna").retrogrado).toBe(false);
  });

  it("luna nueva del 6 de enero de 2000 (18:14 UT) y luna llena del 21 (04:40 UT)", () => {
    expect(calcularCarta(datos("2000-01-06", "18:14", UTC), UTC).faseLunar).toBe("Luna nueva");
    expect(calcularCarta(datos("2000-01-21", "04:40", UTC), UTC).faseLunar).toBe("Luna llena");
  });

  it("Quirón: en Piscis a inicios de 2017 y en Aries a mediados de 2019 (ingreso documentado en 2018)", () => {
    expect(punto(calcularCarta(datos("2017-01-01", "12:00", UTC), UTC), "quiron").signo).toBe("piscis");
    expect(punto(calcularCarta(datos("2019-06-01", "12:00", UTC), UTC), "quiron").signo).toBe("aries");
  });

  it("es determinista: la misma entrada da exactamente la misma carta", () => {
    const d = datos("1992-09-20", "14:45", BOGOTA);
    expect(calcularCarta(d, BOGOTA)).toEqual(calcularCarta(d, BOGOTA));
  });
});

describe("hora desconocida", () => {
  const d = datos("1978-11-23", "", MADRID, { precision: "desconocida" });
  const carta = calcularCarta(d, MADRID);

  it("calcula una carta solar a mediodía, sin Ascendente, Medio Cielo ni casas", () => {
    expect(carta.casas).toEqual([]);
    expect(carta.puntos.some((p) => p.punto === "ascendente" || p.punto === "medioCielo")).toBe(false);
    expect(carta.puntos.every((p) => p.casa === null)).toBe(true);
    expect(carta.configuracion.sistemaCasas).toContain("ninguno");
    expect(carta.utc).toBe(horaLocalAUtc("1978-11-23", "12:00", "Europe/Madrid").utc.toISOString());
  });

  it("avisa y el balance cuenta solo los 10 planetas", () => {
    expect(carta.advertencias.some((a) => a.includes("desconocida"))).toBe(true);
    expect(Object.values(carta.balance.elementos).reduce((s, n) => s + n, 0)).toBe(10);
  });

  it("avisa de la Luna incierta exactamente los días en que cambia de signo (control independiente)", () => {
    const signo = (fecha: string, zona: Lugar) =>
      Math.floor(longitudDeControl(Astronomy.Body.Moon, horaLocalAUtc(fecha, "00:00", zona.zonaHoraria).utc) / 30);
    let conCambio = 0;
    let sinCambio = 0;
    for (let i = 0; i < 12; i++) {
      const fecha = `2001-03-${String(1 + i).padStart(2, "0")}`;
      const cambia = signo(fecha, BOGOTA) !== signo(diaSiguiente(fecha), BOGOTA);
      const res = calcularCarta(datos(fecha, "", BOGOTA, { precision: "desconocida" }), BOGOTA);
      expect(res.advertencias.some((a) => a.includes("cambia de signo")), fecha).toBe(cambia);
      if (cambia) conCambio++;
      else sinCambio++;
    }
    // Se comprobaron los dos escenarios.
    expect(conCambio).toBeGreaterThan(0);
    expect(sinCambio).toBeGreaterThan(0);
  });
});

describe("hora aproximada", () => {
  it("calcula la carta completa pero avisa sobre Ascendente y casas", () => {
    const carta = calcularCarta(datos("1985-03-02", "03:20", BUENOS_AIRES, { precision: "aproximada" }), BUENOS_AIRES);
    expect(carta.casas).toHaveLength(12);
    expect(carta.advertencias.some((a) => a.includes("aproximada"))).toBe(true);
  });
});

describe("latitudes extremas", () => {
  it("usa Signos Enteros más allá de 66° y lo avisa", () => {
    const carta = calcularCarta(datos("2001-07-04", "06:00", TROMSO), TROMSO);
    expect(carta.configuracion.sistemaCasas).toBe("Signos enteros");
    expect(carta.advertencias.some((a) => a.includes("Signos Enteros"))).toBe(true);
    expect(carta.casas).toHaveLength(12);
    // En Signos Enteros cada cúspide cae en el grado 0 de un signo.
    for (const c of carta.casas) expect(c.grado).toBeCloseTo(0, 6);
  });
});
