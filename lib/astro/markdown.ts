/**
 * Lector mínimo de Markdown para el PDF: el texto que redacta la IA (y el que edita Beto)
 * solo usa subtítulos (###), párrafos, listas y **negrita** / *cursiva*. Funciones puras.
 */

export type Bloque =
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; ordenada: boolean; items: string[] };

export interface Segmento {
  texto: string;
  negrita?: boolean;
  cursiva?: boolean;
}

const RE_SUBTITULO = /^#{1,6}\s+(.*)$/;
const RE_ORDENADA = /^\s*\d+[.)]\s+(.*)$/;
const RE_VINETA = /^\s*[-*•]\s+(.*)$/;

export function parsearMarkdown(markdown: string): Bloque[] {
  const lineas = markdown.replace(/\r\n?/g, "\n").split("\n");
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];

  const cerrarParrafo = () => {
    if (parrafo.length > 0) {
      bloques.push({ tipo: "parrafo", texto: parrafo.join(" ").trim() });
      parrafo = [];
    }
  };

  for (const cruda of lineas) {
    const linea = cruda.trimEnd();
    if (linea.trim() === "" || /^(-{3,}|\*{3,}|_{3,})$/.test(linea.trim())) {
      cerrarParrafo();
      continue;
    }

    const subtitulo = RE_SUBTITULO.exec(linea.trim());
    if (subtitulo) {
      cerrarParrafo();
      bloques.push({ tipo: "subtitulo", texto: subtitulo[1].trim() });
      continue;
    }

    const ordenada = RE_ORDENADA.exec(linea);
    const vineta = ordenada ? null : RE_VINETA.exec(linea);
    if (ordenada || vineta) {
      cerrarParrafo();
      const texto = (ordenada ?? vineta)![1].trim();
      const esOrdenada = Boolean(ordenada);
      const ultimo = bloques[bloques.length - 1];
      if (ultimo?.tipo === "lista" && ultimo.ordenada === esOrdenada) ultimo.items.push(texto);
      else bloques.push({ tipo: "lista", ordenada: esOrdenada, items: [texto] });
      continue;
    }

    // Línea con sangría que sigue a un ítem de lista: continúa ese ítem.
    const ultimo = bloques[bloques.length - 1];
    if (/^\s{2,}\S/.test(cruda) && parrafo.length === 0 && ultimo?.tipo === "lista") {
      ultimo.items[ultimo.items.length - 1] += ` ${linea.trim()}`;
      continue;
    }

    parrafo.push(linea.trim());
  }
  cerrarParrafo();
  return bloques;
}

/** Divide un texto en segmentos con **negrita** y *cursiva*. Lo que no cierra se deja tal cual. */
export function parsearInline(texto: string): Segmento[] {
  const segmentos: Segmento[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*?)\*/g;
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) segmentos.push({ texto: texto.slice(ultimo, inicio) });
    if (m[1] !== undefined) segmentos.push({ texto: m[1], negrita: true });
    else segmentos.push({ texto: m[2], cursiva: true });
    ultimo = inicio + m[0].length;
  }
  if (ultimo < texto.length) segmentos.push({ texto: texto.slice(ultimo) });
  return segmentos.length > 0 ? segmentos : [{ texto }];
}
