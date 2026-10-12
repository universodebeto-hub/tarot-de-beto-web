/**
 * Tipos de la carta astral natal (proyecto en docs/carta-astral/).
 *
 * El motor de cálculo (server/astro/engine.ts, por implementar) debe
 * devolver exactamente `CartaNatal`; interpretación y PDF solo dependen de
 * estos tipos, así se puede cambiar de motor sin tocar el resto.
 */

export type Signo =
  | "aries" | "tauro" | "geminis" | "cancer" | "leo" | "virgo"
  | "libra" | "escorpio" | "sagitario" | "capricornio" | "acuario" | "piscis";

export type Punto =
  | "sol" | "luna" | "mercurio" | "venus" | "marte" | "jupiter" | "saturno"
  | "urano" | "neptuno" | "pluton" | "quiron" | "nodoNorte" | "nodoSur"
  | "ascendente" | "medioCielo";

export type Elemento = "fuego" | "tierra" | "aire" | "agua";
export type Modalidad = "cardinal" | "fija" | "mutable";
export type TipoAspecto = "conjuncion" | "oposicion" | "trigono" | "cuadratura" | "sextil";
export type PrecisionHora = "exacta" | "aproximada" | "desconocida";

/** Datos de entrada, armados desde Booking.intakeData. */
export interface DatosNacimiento {
  nombre: string;
  /** AAAA-MM-DD */
  fecha: string;
  /** HH:MM local, 24 h. Si precision = "desconocida" se usa 12:00. */
  hora: string;
  precision: PrecisionHora;
  ciudad: string;
  pais: string;
  region?: string;
}

/** Resultado de geocodificar ciudad + país. */
export interface Lugar {
  nombreMostrado: string;
  lat: number;
  lon: number;
  /** Zona IANA, ej. "America/Bogota" */
  zonaHoraria: string;
}

export interface PosicionPunto {
  punto: Punto;
  signo: Signo;
  /** Grado dentro del signo, 0–30 */
  grado: number;
  /** Longitud eclíptica absoluta, 0–360 */
  longitud: number;
  /** 1–12; null si la hora es desconocida */
  casa: number | null;
  retrogrado: boolean;
}

export interface Cuspide {
  casa: number;
  signo: Signo;
  grado: number;
  longitud: number;
}

export interface Aspecto {
  a: Punto;
  b: Punto;
  tipo: TipoAspecto;
  /** Diferencia respecto al aspecto exacto, en grados */
  orbe: number;
  aplicativo: boolean;
}

export interface CartaNatal {
  datos: DatosNacimiento;
  lugar: Lugar;
  /** Momento de nacimiento en UTC (ISO 8601) */
  utc: string;
  configuracion: {
    zodiaco: "tropical";
    sistemaCasas: string;
    nodos: "verdadero" | "medio";
  };
  puntos: PosicionPunto[];
  /** Vacío si la hora es desconocida */
  casas: Cuspide[];
  aspectos: Aspecto[];
  balance: {
    elementos: Record<Elemento, number>;
    modalidades: Record<Modalidad, number>;
  };
  faseLunar?: string;
  /** Avisos para quien revisa el informe (hora ambigua, Luna aproximada, casas alternativas...). Vacío si no hay nada que señalar. */
  advertencias: string[];
  /** Rueda de la carta, si el motor la entrega */
  svg?: string;
}

/** Resultado de geocodificar ciudad + país (server/astro/geocode.ts). */
export interface ResultadoGeocodificacion {
  /** Mejor coincidencia. */
  lugar: Lugar;
  /** Otras coincidencias, para que el admin pueda elegir si había ambigüedad. */
  alternativas: Lugar[];
  advertencias: string[];
}
