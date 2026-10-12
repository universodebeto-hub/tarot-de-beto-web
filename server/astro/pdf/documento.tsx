/* eslint-disable jsx-a11y/alt-text -- el <Image> de @react-pdf/renderer no es un <img> de HTML y no admite alt */
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { ELEMENTO_DE_SIGNO, MODALIDAD_DE_SIGNO } from "@/lib/astro/config";
import {
  descripcionHora,
  formatearFechaLarga,
  formatearGrado,
} from "@/lib/astro/formato";
import {
  parsearInline,
  parsearMarkdown,
  type Bloque,
} from "@/lib/astro/markdown";
import {
  NOMBRE_ASPECTO,
  NOMBRE_PUNTO,
  NOMBRE_SIGNO,
} from "@/lib/astro/nombres";
import {
  COLOR_ASPECTO,
  COLOR_ELEMENTO,
  SIGLAS_ANGULO,
  SIMBOLO_PUNTO,
  SIMBOLO_SIGNO,
} from "@/lib/astro/simbolos";
import type {
  CartaNatal,
  Elemento,
  Modalidad,
  PosicionPunto,
  Punto,
} from "@/lib/astro/types";
import fijos from "@/data/astro/textos/fijos.json";
import { COLOR, FUENTE, leerLogo } from "./estilos";
import { Rueda } from "./rueda";

/* ───────────────────────────── Tipos públicos ───────────────────────────── */

export interface SeccionPdf {
  id: string;
  titulo: string;
  markdown: string;
}

/** Firma de quien entrega el informe: una imagen (PNG con fondo transparente) o, si no hay, el nombre en letra manuscrita. */
export type FirmaPdf =
  { tipo: "imagen"; png: Buffer } | { tipo: "texto"; texto: string };

export interface ContactoPdf {
  /** URL del sitio, ej. https://www.tarotdebeto.com */
  sitio: string;
  whatsapp?: string;
  email?: string;
}

export interface DatosPdf {
  carta: CartaNatal;
  secciones: SeccionPdf[];
  firma?: FirmaPdf;
  contacto: ContactoPdf;
  fechaElaboracion?: Date;
}

/* ───────────────────────────── Estilos ───────────────────────────── */

const s = StyleSheet.create({
  paginaClara: {
    backgroundColor: COLOR.papel,
    paddingTop: 84,
    paddingBottom: 68,
    paddingHorizontal: 54,
    fontFamily: FUENTE.texto,
    fontSize: 10.5,
    color: COLOR.tinta,
  },
  encabezado: {
    position: "absolute",
    top: 26,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 9,
    borderBottomWidth: 0.7,
    borderBottomColor: COLOR.oro,
  },
  marca: { flexDirection: "row", alignItems: "center" },
  marcaTexto: {
    fontFamily: FUENTE.etiqueta,
    fontSize: 8,
    letterSpacing: 2.2,
    color: COLOR.oroProfundo,
    marginLeft: 8,
  },
  encabezadoDerecha: {
    fontFamily: FUENTE.etiqueta,
    fontSize: 7,
    letterSpacing: 1.4,
    color: COLOR.cenizaOscura,
  },
  pie: {
    position: "absolute",
    bottom: 28,
    left: 54,
    right: 54,
    height: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLOR.linea,
  },
  pieIzq: {
    position: "absolute",
    bottom: 28,
    left: 54,
    width: 330,
    height: 14,
  },
  pieDer: {
    position: "absolute",
    bottom: 28,
    right: 54,
    width: 120,
    height: 14,
    textAlign: "right",
  },
  pieTexto: {
    fontFamily: FUENTE.etiqueta,
    fontSize: 7,
    letterSpacing: 1,
    color: COLOR.ceniza,
  },

  eyebrow: {
    fontFamily: FUENTE.etiqueta,
    fontSize: 8,
    letterSpacing: 3,
    color: COLOR.oroProfundo,
    marginBottom: 6,
  },
  h1: {
    fontFamily: FUENTE.titulo,
    fontWeight: 600,
    fontSize: 26,
    lineHeight: 1.15,
    color: COLOR.tinta,
  },
  regla: {
    width: 46,
    height: 2,
    backgroundColor: COLOR.oro,
    marginTop: 10,
    marginBottom: 18,
  },
  h2: {
    fontFamily: FUENTE.titulo,
    fontWeight: 600,
    fontSize: 14.5,
    color: COLOR.oroProfundo,
    marginTop: 14,
    marginBottom: 5,
  },
  parrafo: { marginBottom: 8, textAlign: "justify" },
  lista: { marginBottom: 8 },
  item: { flexDirection: "row", marginBottom: 4 },
  vineta: {
    width: 20,
    fontFamily: FUENTE.titulo,
    fontWeight: 600,
    color: COLOR.oroProfundo,
  },
  itemTexto: { flex: 1 },

  tablaTitulo: {
    fontFamily: FUENTE.titulo,
    fontWeight: 600,
    fontSize: 13.5,
    color: COLOR.tinta,
    marginTop: 16,
    marginBottom: 6,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 17,
    borderBottomWidth: 0.4,
    borderBottomColor: COLOR.linea,
  },
  filaCabecera: {
    backgroundColor: COLOR.fondoSuave,
    borderBottomWidth: 0.8,
    borderBottomColor: COLOR.oro,
  },
  celdaCabecera: {
    fontFamily: FUENTE.etiqueta,
    fontSize: 7,
    letterSpacing: 1.2,
    color: COLOR.cenizaOscura,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  celda: { fontSize: 9.5, paddingVertical: 2, paddingHorizontal: 4 },
  glifo: { fontFamily: FUENTE.simbolos, fontSize: 11, color: COLOR.tinta },
  nota: {
    fontSize: 8.5,
    color: COLOR.cenizaOscura,
    marginTop: 6,
    lineHeight: 1.4,
  },

  tarjetas: { flexDirection: "row", marginBottom: 14 },
  tarjeta: {
    flex: 1,
    borderWidth: 0.7,
    borderColor: COLOR.linea,
    backgroundColor: "#fffdf8",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tarjetaEtiqueta: {
    fontFamily: FUENTE.etiqueta,
    fontSize: 7,
    letterSpacing: 2,
    color: COLOR.ceniza,
  },
  tarjetaGlifo: {
    fontFamily: FUENTE.simbolos,
    fontSize: 28,
    color: COLOR.oroProfundo,
    marginVertical: 3,
  },
  tarjetaSigno: { fontFamily: FUENTE.titulo, fontSize: 15, color: COLOR.tinta },
  tarjetaPosicion: { fontSize: 8.5, color: COLOR.cenizaOscura, marginTop: 2 },

  barraFila: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barraNombre: { width: 72, fontSize: 9.5 },
  barraFondo: { width: 230, height: 9, backgroundColor: COLOR.fondoSuave },
  barraValor: {
    width: 24,
    textAlign: "right",
    fontFamily: FUENTE.etiqueta,
    fontSize: 8.5,
    color: COLOR.cenizaOscura,
  },

  caja: {
    borderWidth: 0.7,
    borderColor: COLOR.linea,
    backgroundColor: COLOR.fondoSuave,
    padding: 12,
    marginTop: 18,
  },
  cajaTexto: { fontSize: 9, color: COLOR.tintaSuave, lineHeight: 1.5 },
  enlace: { color: COLOR.oroProfundo, textDecoration: "none" },
});

/* ───────────────────────────── Piezas comunes ───────────────────────────── */

const FIJOS = fijos as {
  comoLeer: string;
  cierre: string;
  aviso: string;
  firmaNombre: string;
  firmaCargo: string;
  servicios: string[];
};

function textoInline(texto: string): ReactNode[] {
  return parsearInline(texto).map((seg, k) => (
    <Text
      key={k}
      style={{
        fontWeight: seg.negrita ? 600 : 400,
        fontStyle: seg.cursiva ? "italic" : "normal",
      }}
    >
      {seg.texto}
    </Text>
  ));
}

/**
 * Un subtítulo no debe quedar solo al final de una página. La opción nativa
 * (`minPresenceAhead`) provoca un error de cálculo en @react-pdf/renderer 4.9 cuando el
 * documento también tiene el número de página del pie (`render`), así que se agrupa el
 * subtítulo con el bloque que le sigue, salvo que ese bloque sea largo (en ese caso el
 * texto puede partirse entre páginas sin problema).
 */
const LARGO_MAXIMO_AGRUPADO = 700;

const largoBloque = (b: Bloque) =>
  b.tipo === "lista"
    ? b.items.join(" ").length
    : b.tipo === "parrafo"
      ? b.texto.length
      : 0;

function BloqueMarkdown({ bloque }: { bloque: Bloque }) {
  if (bloque.tipo === "subtitulo")
    return <Text style={s.h2}>{bloque.texto}</Text>;
  if (bloque.tipo === "parrafo") {
    return (
      <Text style={s.parrafo} orphans={2} widows={2}>
        {textoInline(bloque.texto)}
      </Text>
    );
  }
  return (
    <View style={s.lista}>
      {bloque.items.map((item, j) => (
        <View key={j} style={s.item} wrap={false}>
          <Text style={s.vineta}>{bloque.ordenada ? `${j + 1}.` : "•"}</Text>
          <Text style={s.itemTexto}>{textoInline(item)}</Text>
        </View>
      ))}
    </View>
  );
}

export function Markdown({ texto }: { texto: string }) {
  const bloques = parsearMarkdown(texto);
  const salida: ReactNode[] = [];
  for (let i = 0; i < bloques.length; i++) {
    const bloque = bloques[i];
    const siguiente = bloques[i + 1];
    if (
      bloque.tipo === "subtitulo" &&
      siguiente &&
      siguiente.tipo !== "subtitulo" &&
      largoBloque(siguiente) <= LARGO_MAXIMO_AGRUPADO
    ) {
      salida.push(
        <View key={i} wrap={false}>
          <BloqueMarkdown bloque={bloque} />
          <BloqueMarkdown bloque={siguiente} />
        </View>,
      );
      i++;
    } else {
      salida.push(<BloqueMarkdown key={i} bloque={bloque} />);
    }
  }
  return <View>{salida}</View>;
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <View break>
      <Text style={s.eyebrow}>CARTA ASTRAL</Text>
      <Text style={s.h1}>{titulo}</Text>
      <View style={s.regla} />
      {children}
    </View>
  );
}

function Encabezado({ nombre }: { nombre: string }) {
  return (
    <View fixed style={s.encabezado}>
      <View style={s.marca}>
        <Image
          src={leerLogo("emblem.png")}
          style={{ width: 24, height: 24, borderRadius: 5 }}
        />
        <Text style={s.marcaTexto}>TAROT DE BETO</Text>
      </View>
      <Text
        style={s.encabezadoDerecha}
      >{`CARTA ASTRAL · ${nombre.toUpperCase()}`}</Text>
    </View>
  );
}

/**
 * OJO: el pie lleva altura explícita (24) a propósito y sus textos NO. El número de página usa
 * `render` y, sin altura fija en el contenedor, @react-pdf/renderer 4.9 calcula un valor absurdo en
 * documentos largos y falla con "unsupported number". Al revés, una altura fija en el propio texto
 * `render` (o un `lineHeight` propio) hace que react-pdf lo descarte en silencio.
 */
function Pie({ sitio }: { sitio: string }) {
  const host = sitio.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <View fixed style={s.pie}>
      <Text
        style={s.pieTexto}
      >{`${host} · Informe elaborado por ${FIJOS.firmaNombre}`}</Text>
      <Text
        style={s.pieTexto}
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

/* ───────────────────────────── Portada ───────────────────────────── */

const posicion = (carta: CartaNatal, id: Punto): PosicionPunto | undefined =>
  carta.puntos.find((p) => p.punto === id);

function Portada({ datos, fecha }: { datos: DatosPdf; fecha: string }) {
  const { carta } = datos;
  const triada = (["sol", "luna", "ascendente"] as const)
    .map((id) => posicion(carta, id))
    .filter((p): p is PosicionPunto => p !== undefined);

  return (
    <Page
      size="A4"
      style={{
        backgroundColor: COLOR.obsidiana,
        fontFamily: FUENTE.texto,
        color: COLOR.hueso,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          borderWidth: 0.8,
          borderColor: COLOR.oro,
          opacity: 0.6,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 31,
          left: 31,
          right: 31,
          bottom: 31,
          borderWidth: 0.4,
          borderColor: COLOR.oro,
          opacity: 0.35,
        }}
      />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          paddingTop: 64,
          paddingHorizontal: 64,
        }}
      >
        <Image
          src={leerLogo("logo-full.png")}
          style={{ width: 190, height: 190 }}
        />
        <Text
          style={{
            fontFamily: FUENTE.etiqueta,
            fontSize: 9,
            letterSpacing: 5,
            color: COLOR.oro,
            marginTop: 4,
          }}
        >
          UNIVERSO DE BETO
        </Text>
        <Text
          style={{
            fontFamily: FUENTE.titulo,
            fontWeight: 600,
            fontSize: 50,
            color: COLOR.oroSuave,
            marginTop: 26,
            lineHeight: 1.05,
          }}
        >
          Carta Astral
        </Text>
        <Text
          style={{
            fontFamily: FUENTE.titulo,
            fontStyle: "italic",
            fontSize: 15,
            color: COLOR.hueso,
            marginTop: 8,
          }}
        >
          Informe natal personalizado
        </Text>

        <View
          style={{
            width: 64,
            height: 1,
            backgroundColor: COLOR.oro,
            marginVertical: 30,
          }}
        />

        <Text
          style={{
            fontFamily: FUENTE.etiqueta,
            fontSize: 8,
            letterSpacing: 3,
            color: COLOR.ceniza,
          }}
        >
          PREPARADO PARA
        </Text>
        <Text
          style={{
            fontFamily: FUENTE.titulo,
            fontSize: 30,
            color: COLOR.hueso,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {carta.datos.nombre}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: COLOR.hueso,
            marginTop: 14,
            opacity: 0.85,
          }}
        >
          {formatearFechaLarga(carta.datos.fecha)}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: COLOR.hueso,
            marginTop: 2,
            opacity: 0.85,
            textAlign: "center",
          }}
        >
          {`${descripcionHora(carta.datos)} · ${carta.lugar.nombreMostrado.split(",").slice(0, 1).join("")}, ${carta.datos.pais}`}
        </Text>

        <View style={{ flexDirection: "row", marginTop: 36 }}>
          {triada.map((p) => (
            <View
              key={p.punto}
              style={{ alignItems: "center", marginHorizontal: 18 }}
            >
              <Text
                style={{
                  fontFamily: FUENTE.simbolos,
                  fontSize: 24,
                  color: COLOR.oro,
                }}
              >
                {SIMBOLO_SIGNO[p.signo]}
              </Text>
              <Text
                style={{
                  fontFamily: FUENTE.etiqueta,
                  fontSize: 7,
                  letterSpacing: 2,
                  color: COLOR.ceniza,
                  marginTop: 5,
                }}
              >
                {NOMBRE_PUNTO[p.punto].toUpperCase()}
              </Text>
              <Text
                style={{
                  fontFamily: FUENTE.titulo,
                  fontStyle: "italic",
                  fontSize: 12.5,
                  color: COLOR.hueso,
                  marginTop: 2,
                }}
              >
                {NOMBRE_SIGNO[p.signo]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 52,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: FUENTE.etiqueta,
            fontSize: 7.5,
            letterSpacing: 2,
            color: COLOR.ceniza,
          }}
        >
          {`ELABORADO POR ${FIJOS.firmaNombre.toUpperCase()} · ${fecha.toUpperCase()}`}
        </Text>
        <Text
          style={{
            fontFamily: FUENTE.etiqueta,
            fontSize: 7.5,
            letterSpacing: 2,
            color: COLOR.oro,
            marginTop: 4,
          }}
        >
          {datos.contacto.sitio
            .replace(/^https?:\/\//, "")
            .replace(/\/$/, "")
            .toUpperCase()}
        </Text>
      </View>
    </Page>
  );
}

/* ───────────────────────────── Rueda y tablas ───────────────────────────── */

function PaginaRueda({ carta }: { carta: CartaNatal }) {
  const hayHora = carta.casas.length === 12;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ alignSelf: "stretch" }}>
        <Text style={s.eyebrow}>CARTA ASTRAL</Text>
        <Text style={s.h1}>La rueda de tu carta</Text>
        <View style={s.regla} />
      </View>
      <Rueda carta={carta} tamano={470} />
      <Text style={[s.nota, { textAlign: "center", marginTop: 10 }]}>
        {hayHora
          ? `Casas ${carta.configuracion.sistemaCasas} · zodíaco tropical · nodos verdaderos. AC = Ascendente, MC = Medio Cielo, R = retrógrado.`
          : "Sin la hora de nacimiento no se calculan el Ascendente ni las casas: la rueda muestra el zodíaco y la posición de los planetas."}
      </Text>
      <View style={{ flexDirection: "row", marginTop: 12 }}>
        {(
          [
            "conjuncion",
            "sextil",
            "trigono",
            "cuadratura",
            "oposicion",
          ] as const
        ).map((t) => (
          <View
            key={t}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginHorizontal: 8,
            }}
          >
            <View
              style={{
                width: 14,
                height: 2,
                backgroundColor: COLOR_ASPECTO[t],
                marginRight: 4,
              }}
            />
            <Text style={{ fontSize: 8.5, color: COLOR.tintaSuave }}>
              {NOMBRE_ASPECTO[t]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ANCHOS = {
  punto: 150,
  signo: 120,
  posicion: 84,
  casa: 46,
  mov: 40,
} as const;

function TablaPuntos({ carta }: { carta: CartaNatal }) {
  const hayHora = carta.casas.length === 12;
  return (
    <View>
      <View style={[s.fila, s.filaCabecera]}>
        <Text style={[s.celdaCabecera, { width: ANCHOS.punto }]}>PUNTO</Text>
        <Text style={[s.celdaCabecera, { width: ANCHOS.signo }]}>SIGNO</Text>
        <Text style={[s.celdaCabecera, { width: ANCHOS.posicion }]}>
          POSICIÓN
        </Text>
        <Text style={[s.celdaCabecera, { width: ANCHOS.casa }]}>CASA</Text>
        <Text style={[s.celdaCabecera, { width: ANCHOS.mov }]}>MOV.</Text>
      </View>
      {carta.puntos.map((p) => (
        <View key={p.punto} style={s.fila} wrap={false}>
          <View
            style={{
              width: ANCHOS.punto,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={[
                SIGLAS_ANGULO.has(p.punto)
                  ? {
                      fontFamily: FUENTE.etiqueta,
                      fontSize: 7.5,
                      color: COLOR.oroProfundo,
                    }
                  : s.glifo,
                { width: 20 },
              ]}
            >
              {SIMBOLO_PUNTO[p.punto]}
            </Text>
            <Text style={{ fontSize: 9.5 }}>{NOMBRE_PUNTO[p.punto]}</Text>
          </View>
          <View
            style={{
              width: ANCHOS.signo,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={[
                s.glifo,
                {
                  width: 18,
                  color: COLOR_ELEMENTO[ELEMENTO_DE_SIGNO[p.signo]],
                },
              ]}
            >
              {SIMBOLO_SIGNO[p.signo]}
            </Text>
            <Text style={{ fontSize: 9.5 }}>{NOMBRE_SIGNO[p.signo]}</Text>
          </View>
          <Text
            style={[
              s.celda,
              {
                width: ANCHOS.posicion,
                fontFamily: FUENTE.etiqueta,
                fontSize: 8.5,
              },
            ]}
          >
            {formatearGrado(p.grado)}
          </Text>
          <Text
            style={[
              s.celda,
              {
                width: ANCHOS.casa,
                fontFamily: FUENTE.etiqueta,
                fontSize: 8.5,
              },
            ]}
          >
            {p.casa ?? "—"}
          </Text>
          <Text
            style={[
              s.celda,
              {
                width: ANCHOS.mov,
                fontFamily: FUENTE.etiqueta,
                fontSize: 8.5,
                color: COLOR.brasa,
              },
            ]}
          >
            {p.retrogrado ? "R" : ""}
          </Text>
        </View>
      ))}
      <Text style={s.nota}>
        {hayHora
          ? "R = retrógrado. AC = Ascendente, MC = Medio Cielo."
          : "R = retrógrado. Sin la hora de nacimiento no hay Ascendente, Medio Cielo ni casas."}
      </Text>
    </View>
  );
}

function TablaCasas({ carta }: { carta: CartaNatal }) {
  if (carta.casas.length !== 12) return null;
  const celda = (i: number) => {
    const c = carta.casas[i];
    return (
      <View
        key={c.casa}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          minHeight: 17,
          borderBottomWidth: 0.4,
          borderBottomColor: COLOR.linea,
        }}
      >
        <Text
          style={{
            width: 52,
            fontFamily: FUENTE.etiqueta,
            fontSize: 8,
            color: COLOR.cenizaOscura,
            paddingHorizontal: 4,
          }}
        >{`CASA ${c.casa}`}</Text>
        <Text
          style={[
            s.glifo,
            { width: 16, color: COLOR_ELEMENTO[ELEMENTO_DE_SIGNO[c.signo]] },
          ]}
        >
          {SIMBOLO_SIGNO[c.signo]}
        </Text>
        <Text style={{ fontSize: 9.5, width: 74 }}>
          {NOMBRE_SIGNO[c.signo]}
        </Text>
        <Text style={{ fontFamily: FUENTE.etiqueta, fontSize: 8.5 }}>
          {formatearGrado(c.grado)}
        </Text>
      </View>
    );
  };
  return (
    <View>
      <Text style={s.tablaTitulo}>Cúspides de las casas</Text>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ flexDirection: "row" }} wrap={false}>
          {celda(i)}
          <View style={{ width: 18 }} />
          {celda(i + 6)}
        </View>
      ))}
    </View>
  );
}

function TablaAspectos({ carta }: { carta: CartaNatal }) {
  const filas = carta.aspectos.slice(0, 22);
  if (filas.length === 0) return null;
  return (
    <View break>
      <Text style={s.tablaTitulo}>Aspectos principales</Text>
      <View style={[s.fila, s.filaCabecera]}>
        <Text style={[s.celdaCabecera, { width: 118 }]}>PUNTO</Text>
        <Text style={[s.celdaCabecera, { width: 84 }]}>ASPECTO</Text>
        <Text style={[s.celdaCabecera, { width: 118 }]}>PUNTO</Text>
        <Text style={[s.celdaCabecera, { width: 50 }]}>ORBE</Text>
        <Text style={[s.celdaCabecera, { width: 70 }]}>MOVIMIENTO</Text>
      </View>
      {filas.map((a, i) => (
        <View key={i} style={s.fila} wrap={false}>
          <Text style={[s.celda, { width: 118 }]}>{NOMBRE_PUNTO[a.a]}</Text>
          <View
            style={{
              width: 84,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLOR_ASPECTO[a.tipo],
                marginRight: 5,
              }}
            />
            <Text style={{ fontSize: 9.5 }}>{NOMBRE_ASPECTO[a.tipo]}</Text>
          </View>
          <Text style={[s.celda, { width: 118 }]}>{NOMBRE_PUNTO[a.b]}</Text>
          <Text
            style={[
              s.celda,
              { width: 50, fontFamily: FUENTE.etiqueta, fontSize: 8.5 },
            ]}
          >{`${a.orbe.toFixed(2)}°`}</Text>
          <Text
            style={[
              s.celda,
              { width: 70, fontSize: 8.5, color: COLOR.cenizaOscura },
            ]}
          >
            {a.aplicativo ? "aplicativo" : "separativo"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PaginaTabla({ carta }: { carta: CartaNatal }) {
  return (
    <View break>
      <Text style={s.eyebrow}>CARTA ASTRAL</Text>
      <Text style={s.h1}>Tabla técnica</Text>
      <View style={s.regla} />
      <TablaPuntos carta={carta} />
      <TablaCasas carta={carta} />
      <TablaAspectos carta={carta} />
    </View>
  );
}

/* ───────────────────────────── Cómo leer ───────────────────────────── */

function Leyenda() {
  const signos = Object.keys(SIMBOLO_SIGNO) as (keyof typeof SIMBOLO_SIGNO)[];
  const puntos = (Object.keys(SIMBOLO_PUNTO) as Punto[]).filter(
    (p) => !SIGLAS_ANGULO.has(p),
  );
  const fila = (
    glifo: string,
    nombre: string,
    detalle: string,
    color: string,
    k: string,
  ) => (
    <View
      key={k}
      style={{ flexDirection: "row", alignItems: "center", minHeight: 15 }}
      wrap={false}
    >
      <Text
        style={{ fontFamily: FUENTE.simbolos, fontSize: 11, width: 20, color }}
      >
        {glifo}
      </Text>
      <Text style={{ fontSize: 9, width: 66 }}>{nombre}</Text>
      <Text style={{ fontSize: 8, color: COLOR.ceniza }}>{detalle}</Text>
    </View>
  );
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.tablaTitulo}>Leyenda de símbolos</Text>
      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          {signos.map((sg) =>
            fila(
              SIMBOLO_SIGNO[sg],
              NOMBRE_SIGNO[sg],
              `${ELEMENTO_DE_SIGNO[sg]} · ${MODALIDAD_DE_SIGNO[sg]}`,
              COLOR_ELEMENTO[ELEMENTO_DE_SIGNO[sg]],
              sg,
            ),
          )}
        </View>
        <View style={{ flex: 1 }}>
          {puntos.map((pt) =>
            fila(SIMBOLO_PUNTO[pt], NOMBRE_PUNTO[pt], "", COLOR.tinta, pt),
          )}
        </View>
      </View>
    </View>
  );
}

/* ───────────────────────────── Secciones con gráficos ───────────────────────────── */

function TarjetasTriada({ carta }: { carta: CartaNatal }) {
  const puntos = (["sol", "luna", "ascendente"] as const)
    .map((id) => posicion(carta, id))
    .filter((p): p is PosicionPunto => p !== undefined);
  return (
    <View style={s.tarjetas}>
      {puntos.map((p, i) => (
        <View key={p.punto} style={[s.tarjeta, i > 0 ? { marginLeft: 8 } : {}]}>
          <Text style={s.tarjetaEtiqueta}>
            {NOMBRE_PUNTO[p.punto].toUpperCase()}
          </Text>
          <Text style={s.tarjetaGlifo}>{SIMBOLO_SIGNO[p.signo]}</Text>
          <Text style={s.tarjetaSigno}>{NOMBRE_SIGNO[p.signo]}</Text>
          <Text
            style={s.tarjetaPosicion}
          >{`${formatearGrado(p.grado)}${p.casa ? ` · Casa ${p.casa}` : ""}`}</Text>
        </View>
      ))}
    </View>
  );
}

function Barras({
  titulo,
  datos,
}: {
  titulo: string;
  datos: { nombre: string; valor: number; color: string }[];
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <View style={{ marginBottom: 12 }} wrap={false}>
      <Text style={[s.tablaTitulo, { marginTop: 0 }]}>{titulo}</Text>
      {datos.map((d) => (
        <View key={d.nombre} style={s.barraFila}>
          <Text style={s.barraNombre}>{d.nombre}</Text>
          <View style={s.barraFondo}>
            <View
              style={{
                width: (d.valor / maximo) * 230,
                height: 9,
                backgroundColor: d.color,
              }}
            />
          </View>
          <Text style={s.barraValor}>{String(d.valor)}</Text>
        </View>
      ))}
    </View>
  );
}

const MAYUS = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function GraficoBalance({ carta }: { carta: CartaNatal }) {
  const el = carta.balance.elementos;
  const mo = carta.balance.modalidades;
  return (
    <View style={{ marginBottom: 6 }}>
      <Barras
        titulo="Elementos"
        datos={(Object.keys(el) as Elemento[]).map((k) => ({
          nombre: MAYUS(k),
          valor: el[k],
          color: COLOR_ELEMENTO[k],
        }))}
      />
      <Barras
        titulo="Modalidades"
        datos={(Object.keys(mo) as Modalidad[]).map((k) => ({
          nombre: MAYUS(k),
          valor: mo[k],
          color: COLOR.oroProfundo,
        }))}
      />
    </View>
  );
}

/* ───────────────────────────── Cierre y firma ───────────────────────────── */

function Firma({ firma }: { firma: FirmaPdf }) {
  if (firma.tipo === "imagen") {
    return (
      <Image
        src={{ data: firma.png, format: "png" }}
        style={{ height: 54, objectFit: "contain", objectPosition: "left" }}
      />
    );
  }
  return (
    <Text
      style={{
        fontFamily: FUENTE.firma,
        fontSize: 38,
        color: COLOR.oroProfundo,
        lineHeight: 1.1,
      }}
    >
      {firma.texto}
    </Text>
  );
}

function Cierre({ datos }: { datos: DatosPdf }) {
  const firma = datos.firma ?? {
    tipo: "texto" as const,
    texto: FIJOS.firmaNombre,
  };
  const { whatsapp, email, sitio } = datos.contacto;
  const wa = whatsapp?.replace(/[^\d]/g, "");
  return (
    <View break>
      <Text style={s.eyebrow}>CARTA ASTRAL</Text>
      <Text style={s.h1}>Un último mensaje</Text>
      <View style={s.regla} />
      <Text
        style={[
          s.parrafo,
          {
            fontFamily: FUENTE.titulo,
            fontStyle: "italic",
            fontSize: 12,
            lineHeight: 1.6,
            textAlign: "left",
          },
        ]}
      >
        {FIJOS.cierre}
      </Text>

      <View style={{ marginTop: 16 }} wrap={false}>
        <Text
          style={{
            fontFamily: FUENTE.titulo,
            fontStyle: "italic",
            fontSize: 12,
            color: COLOR.tintaSuave,
          }}
        >
          Con cariño,
        </Text>
        <View style={{ marginTop: 4, marginBottom: 2 }}>
          <Firma firma={firma} />
        </View>
        <View
          style={{
            width: 190,
            height: 0.8,
            backgroundColor: COLOR.oro,
            marginVertical: 5,
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            src={leerLogo("emblem.png")}
            style={{ width: 34, height: 34, borderRadius: 7 }}
          />
          <View style={{ marginLeft: 10 }}>
            <Text
              style={{
                fontFamily: FUENTE.titulo,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {FIJOS.firmaNombre}
            </Text>
            <Text
              style={{ fontSize: 9, color: COLOR.cenizaOscura }}
            >{`${FIJOS.firmaCargo} · Tarot de Beto`}</Text>
          </View>
        </View>
      </View>

      <View style={s.caja} wrap={false}>
        <Text
          style={{
            fontFamily: FUENTE.etiqueta,
            fontSize: 7.5,
            letterSpacing: 2,
            color: COLOR.oroProfundo,
            marginBottom: 5,
          }}
        >
          SOBRE ESTE INFORME
        </Text>
        <Text style={s.cajaTexto}>{FIJOS.aviso}</Text>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={s.tablaTitulo}>Para seguir acompañándote</Text>
        {FIJOS.servicios.map((servicio) => (
          <View
            key={servicio}
            style={{ flexDirection: "row", marginBottom: 3 }}
          >
            <Text style={s.vineta}>•</Text>
            <Text style={{ flex: 1 }}>{servicio}</Text>
          </View>
        ))}
        <View style={{ marginTop: 10 }}>
          <Text>
            {"Web: "}
            <Link src={sitio} style={s.enlace}>
              {sitio.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </Link>
          </Text>
          {wa ? (
            <Text>
              {"WhatsApp: "}
              <Link src={`https://wa.me/${wa}`} style={s.enlace}>
                {`+${wa}`}
              </Link>
            </Text>
          ) : null}
          {email ? (
            <Text>
              {"Correo: "}
              <Link src={`mailto:${email}`} style={s.enlace}>
                {email}
              </Link>
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/* ───────────────────────────── Documento ───────────────────────────── */

export function InformePdf(datos: DatosPdf) {
  const { carta, secciones, contacto } = datos;
  const fecha = formatearFechaLarga(
    (datos.fechaElaboracion ?? new Date()).toISOString().slice(0, 10),
  );
  const nombre = carta.datos.nombre;

  return (
    <Document
      title={`Carta Astral · ${nombre}`}
      author={FIJOS.firmaNombre}
      subject="Informe de carta astral natal"
      creator="Tarot de Beto"
      producer="Tarot de Beto"
    >
      <Portada datos={datos} fecha={fecha} />

      <Page size="A4" style={s.paginaClara}>
        <Encabezado nombre={nombre} />
        <Pie sitio={contacto.sitio} />

        {/* El interlineado va en este contenedor y no en la página: heredado desde la página, react-pdf descarta el número de página del pie. */}
        <View style={{ lineHeight: 1.55 }}>
          <PaginaRueda carta={carta} />
          <PaginaTabla carta={carta} />

          <Seccion titulo="Cómo leer este informe">
            <Markdown texto={FIJOS.comoLeer} />
            <Leyenda />
          </Seccion>

          {secciones.map((seccion) => (
            <Seccion key={seccion.id} titulo={seccion.titulo}>
              {seccion.id === "triada" ? (
                <TarjetasTriada carta={carta} />
              ) : null}
              {seccion.id === "balance" ? (
                <GraficoBalance carta={carta} />
              ) : null}
              <Markdown texto={seccion.markdown} />
            </Seccion>
          ))}

          <Cierre datos={datos} />
        </View>
      </Page>
    </Document>
  );
}
