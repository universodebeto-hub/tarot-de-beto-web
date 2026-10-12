import { NextResponse } from "next/server";
import sweph from "sweph";

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

  return NextResponse.json({
    plataforma: process.platform,
    arquitectura: process.arch,
    node: process.version,
    sol_J2000: longitud,
    esperado,
    ok: !r.error && Math.abs(longitud - esperado) < 0.1,
  });
}
