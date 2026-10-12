import { NextResponse } from "next/server";
import sweph from "sweph";
import { calcularCarta } from "@/server/astro/engine";

export const runtime = "nodejs";

/**
 * TEMPORAL -- Fase 0 de la carta astral (docs/carta-astral/05-plan-fases.md).
 * Sirve solo para comprobar que el módulo nativo de Swiss Ephemeris carga y
 * calcula bien dentro de Vercel (plataforma y arquitectura incluidas en la
 * respuesta). Devuelve únicamente el Sol en una fecha astronómica de
 * referencia (J2000): ningún dato de personas ni de la configuración, por eso
 * no pide credenciales -- las preview de Vercel ya exigen iniciar sesión en
 * Vercel. En producción responde 404, así que aunque esta rama se mezclara por
 * error nunca queda expuesta. BORRAR esta ruta al terminar la Fase 0.
 */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const { constants: C } = sweph;
  const jd = sweph.julday(2000, 1, 1, 12, C.SE_GREG_CAL);
  const r = sweph.calc_ut(jd, C.SE_SUN, C.SEFLG_MOSEPH | C.SEFLG_SPEED);
  const longitud = r.data[0];
  const esperado = 280.37;

  // Carta completa de una persona FICTICIA (Fase 1): comprueba también que el
  // archivo de efemérides de Quirón viaje con la función y que Placidus calcule.
  let cartaPrueba: Record<string, unknown>;
  try {
    const carta = calcularCarta(
      { nombre: "Persona de prueba", fecha: "1992-09-20", hora: "14:45", precision: "exacta", ciudad: "Bogotá", pais: "Colombia" },
      { nombreMostrado: "Bogotá", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" },
    );
    const pos = (p: string) => carta.puntos.find((x) => x.punto === p);
    cartaPrueba = {
      utc: carta.utc,
      sistemaCasas: carta.configuracion.sistemaCasas,
      sol: `${pos("sol")?.signo} ${pos("sol")?.grado.toFixed(2)}`,
      ascendente: `${pos("ascendente")?.signo} ${pos("ascendente")?.grado.toFixed(2)}`,
      quiron: `${pos("quiron")?.signo} ${pos("quiron")?.grado.toFixed(2)}`,
      aspectos: carta.aspectos.length,
      ok: pos("sol")?.signo === "virgo" && pos("ascendente")?.signo === "capricornio" && pos("quiron") !== undefined,
    };
  } catch (error) {
    cartaPrueba = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json({
    plataforma: process.platform,
    arquitectura: process.arch,
    node: process.version,
    sol_J2000: longitud,
    esperado,
    cartaPrueba,
    ok: !r.error && Math.abs(longitud - esperado) < 0.1 && cartaPrueba.ok === true,
  });
}
