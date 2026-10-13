import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { SECCIONES } from "../interpret";
import { InformePdf, type DatosPdf, type SeccionPdf } from "./documento";
import { registrarFuentes } from "./estilos";

export { leerFirmaPorDefecto } from "./estilos";

export type { ContactoPdf, DatosPdf, FirmaPdf, SeccionPdf } from "./documento";

/** Ordena las secciones como en el informe (las que no se reconocen van al final, en su orden). */
export function ordenarSecciones(secciones: readonly SeccionPdf[]): SeccionPdf[] {
  const posicion = new Map<string, number>(SECCIONES.map((s, i) => [s.id, i]));
  return [...secciones].sort((a, b) => (posicion.get(a.id) ?? 999) - (posicion.get(b.id) ?? 999));
}

/**
 * Genera el PDF del informe en memoria. Nunca se guarda en ningún almacenamiento: el panel
 * lo genera cada vez que Beto lo descarga (el repo es público y los datos de los clientes
 * viven solo en la base de datos privada).
 */
export async function generarInformePdf(datos: DatosPdf): Promise<Buffer> {
  registrarFuentes();
  return renderToBuffer(InformePdf({ ...datos, secciones: ordenarSecciones(datos.secciones) }));
}
