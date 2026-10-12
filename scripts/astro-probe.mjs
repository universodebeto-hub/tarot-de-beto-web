// Fase 0 (docs/carta-astral/05-plan-fases.md): prueba del motor de cálculo.
// Calcula posiciones con Swiss Ephemeris (sweph) y las cruza con un motor
// independiente (astronomy-engine, MIT). Usa solo fechas astronómicas de
// referencia -- ningún dato de personas reales.
import sweph from "sweph";
import * as Astronomy from "astronomy-engine";

const { constants: C } = sweph;
const FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SPEED; // modo interno, sin archivos de efemérides

const CUERPOS = [
  ["Sol", C.SE_SUN, Astronomy.Body.Sun],
  ["Luna", C.SE_MOON, Astronomy.Body.Moon],
  ["Mercurio", C.SE_MERCURY, Astronomy.Body.Mercury],
  ["Venus", C.SE_VENUS, Astronomy.Body.Venus],
  ["Marte", C.SE_MARS, Astronomy.Body.Mars],
  ["Júpiter", C.SE_JUPITER, Astronomy.Body.Jupiter],
  ["Saturno", C.SE_SATURN, Astronomy.Body.Saturn],
  ["Urano", C.SE_URANUS, Astronomy.Body.Uranus],
  ["Neptuno", C.SE_NEPTUNE, Astronomy.Body.Neptune],
  ["Plutón", C.SE_PLUTO, Astronomy.Body.Pluto],
];

/** Longitud eclíptica geocéntrica tropical (eclíptica verdadera de la fecha), con astronomy-engine. */
function lonAstronomyEngine(body, date) {
  const rot = Astronomy.Rotation_EQJ_ECT(date);
  const eqj = Astronomy.GeoVector(body, date, true);
  const ect = Astronomy.RotateVector(rot, eqj);
  const lon = Astronomy.SphereFromVector(ect).lon;
  return (lon + 360) % 360;
}

function difGrados(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const FECHAS = [
  { etiqueta: "J2000 (2000-01-01 12:00 UT)", y: 2000, m: 1, d: 1, h: 12 },
  { etiqueta: "1992-06-15 08:30 UT", y: 1992, m: 6, d: 15, h: 8.5 },
  { etiqueta: "1975-11-03 22:10 UT", y: 1975, m: 11, d: 3, h: 22 + 10 / 60 },
  { etiqueta: "2015-03-20 09:45 UT (equinoccio)", y: 2015, m: 3, d: 20, h: 9 + 45 / 60 },
];

let maxDif = 0;
for (const f of FECHAS) {
  const jd = sweph.julday(f.y, f.m, f.d, f.h, C.SE_GREG_CAL);
  const fecha = new Date(Date.UTC(f.y, f.m - 1, f.d, Math.floor(f.h), Math.round((f.h % 1) * 60)));
  console.log(`\n${f.etiqueta}  (JD ${jd.toFixed(5)})`);
  for (const [nombre, id, body] of CUERPOS) {
    const r = sweph.calc_ut(jd, id, FLAGS);
    if (r.error) throw new Error(`${nombre}: ${r.error}`);
    const a = r.data[0];
    const b = lonAstronomyEngine(body, fecha);
    const dif = difGrados(a, b);
    maxDif = Math.max(maxDif, dif);
    const retro = r.data[3] < 0 ? " R" : "";
    console.log(`  ${nombre.padEnd(9)} sweph ${a.toFixed(4).padStart(9)}°  astronomy-engine ${b.toFixed(4).padStart(9)}°  dif ${dif.toFixed(4)}°${retro}`);
  }
}

// Referencia publicada: Sol en J2000 ~ 280.37° (Capricornio 10°22').
const sol = sweph.calc_ut(sweph.julday(2000, 1, 1, 12, C.SE_GREG_CAL), C.SE_SUN, FLAGS).data[0];
console.log(`\nSol J2000 = ${sol.toFixed(4)}° (referencia publicada ~280.37°)`);
console.log(`Diferencia máxima entre los dos motores: ${maxDif.toFixed(4)}°`);

// Ascendente, Medio Cielo y casas Placidus: Bogotá en el equinoccio de 2015, 09:45 UT (referencia astronómica, no una persona).
const jdAsc = sweph.julday(2015, 3, 20, 9 + 45 / 60, C.SE_GREG_CAL);
const casas = sweph.houses(jdAsc, 4.711, -74.0721, "P");
console.log(`\nCasas Placidus (Bogotá, equinoccio 2015 09:45 UT): ASC ${casas.data.points[0].toFixed(3)}°  MC ${casas.data.points[1].toFixed(3)}°`);
console.log("Cúspides:", casas.data.houses.map((h) => h.toFixed(2)).join(" "));

const ok = Math.abs(sol - 280.37) < 0.1 && maxDif < 0.1;
console.log(ok ? "\nRESULTADO: OK (Sol dentro de 0,1° de la referencia y motores coinciden)" : "\nRESULTADO: REVISAR");
process.exit(ok ? 0 : 1);
