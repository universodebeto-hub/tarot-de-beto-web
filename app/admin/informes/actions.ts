"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  avanzarInformeAdmin,
  corregirLugar,
  guardarFirma,
  guardarSeccion,
  marcarEntregado,
  quitarFirma,
  registrarSolicitudManual,
  regenerarSeccion,
  type CorreccionLugar,
  type SolicitudManualInput,
} from "@/server/admin/informes";
import type { ResultadoPaso } from "@/server/astro/informes";

/**
 * La redacción con IA tarda: una sección puede pasar de 10 s. Esta página (y sus acciones) tiene
 * margen de 60 s por petición; el panel pide UN paso a la vez para no acercarse nunca al límite.
 */

export async function avanzarInformeAction(id: string): Promise<ResultadoPaso> {
  let resultado: ResultadoPaso;
  try {
    resultado = await avanzarInformeAdmin(id);
  } catch (e) {
    return { estado: "PENDIENTE", paso: null, quedanPasos: false, error: e instanceof Error ? e.message : "Error." };
  }
  revalidatePath(`/admin/informes/${id}`);
  return resultado;
}

export async function guardarSeccionAction(id: string, seccionId: string, markdown: string) {
  const r = await guardarSeccion(id, seccionId, markdown);
  if (!r.error) revalidatePath(`/admin/informes/${id}`);
  return r;
}

export async function regenerarSeccionAction(id: string, seccionId: string) {
  const r = await regenerarSeccion(id, seccionId);
  if (!r.error) revalidatePath(`/admin/informes/${id}`);
  return r;
}

export async function corregirLugarAction(id: string, correccion: CorreccionLugar) {
  const r = await corregirLugar(id, correccion);
  if (!r.error) revalidatePath(`/admin/informes/${id}`);
  return r;
}

export async function marcarEntregadoAction(id: string) {
  const r = await marcarEntregado(id);
  if (!r.error) {
    revalidatePath(`/admin/informes/${id}`);
    revalidatePath("/admin/informes");
  }
  return r;
}

export async function guardarFirmaAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const archivo = formData.get("firma");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo PNG." };
  const r = await guardarFirma(Buffer.from(await archivo.arrayBuffer()));
  if (r.error) return r;
  revalidatePath("/admin/informes");
  return { success: true };
}

export async function quitarFirmaAction(): Promise<void> {
  await quitarFirma();
  revalidatePath("/admin/informes");
}

/** Registra una solicitud que no entró por la web y abre su informe. */
export async function registrarSolicitudAction(input: SolicitudManualInput): Promise<{ error?: string }> {
  const r = await registrarSolicitudManual(input);
  if (r.error || !r.informeId) return { error: r.error ?? "No se pudo registrar." };
  revalidatePath("/admin/informes");
  redirect(`/admin/informes/${r.informeId}`);
}
