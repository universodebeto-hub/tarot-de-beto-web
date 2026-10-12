import "server-only";
import tzlookup from "tz-lookup";
import type { Lugar, ResultadoGeocodificacion } from "@/lib/astro/types";

/**
 * Ciudad + país → coordenadas y zona horaria IANA.
 *
 * Coordenadas: Nominatim (OpenStreetMap), sin cuenta ni clave. Su política de uso
 * pide identificarse con un User-Agent y no pasar de 1 consulta por segundo: acá
 * se hace una sola consulta por informe, disparada por un clic del admin.
 * Zona horaria: `tz-lookup` (polígonos incluidos en el paquete, sin llamada de red).
 * Si algún día hace falta otro proveedor (ej. GeoNames), solo cambia este archivo.
 */

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "TarotDeBeto-CartaAstral/1.0 (+https://www.tarotdebeto.com)";
const TIMEOUT_MS = 8000;
const MAX_RESULTADOS = 5;
/** Dos resultados a más de esta distancia se consideran ciudades distintas con el mismo nombre. */
const DISTANCIA_AMBIGUA_KM = 50;

interface RespuestaNominatim {
  display_name: string;
  lat: string;
  lon: string;
}

export interface OpcionesGeocodificar {
  /** Desambiguar ciudades homónimas (San José, Santa Rosa...). */
  region?: string;
  /** Solo para pruebas. */
  fetchImpl?: typeof fetch;
}

function distanciaKm(a: Lugar, b: Lugar): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function aLugar(r: RespuestaNominatim): Lugar | null {
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let zonaHoraria: string;
  try {
    zonaHoraria = tzlookup(lat, lon);
  } catch {
    return null;
  }
  return { nombreMostrado: r.display_name, lat, lon, zonaHoraria };
}

export async function geocodificar(
  ciudad: string,
  pais: string,
  opciones: OpcionesGeocodificar = {},
): Promise<ResultadoGeocodificacion> {
  const consulta = [ciudad, opciones.region, pais].map((s) => s?.trim()).filter(Boolean).join(", ");
  if (!ciudad.trim() || !pais.trim()) throw new Error("Faltan la ciudad o el país de nacimiento.");

  const url = `${ENDPOINT}?${new URLSearchParams({
    q: consulta,
    format: "jsonv2",
    limit: String(MAX_RESULTADOS),
    "accept-language": "es",
  })}`;

  const doFetch = opciones.fetchImpl ?? fetch;
  const res = await doFetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "es" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`El servicio de ubicaciones respondió ${res.status}.`);

  const crudo = (await res.json()) as RespuestaNominatim[];
  const lugares = crudo.map(aLugar).filter((l): l is Lugar => l !== null);
  if (lugares.length === 0) {
    throw new Error(`No se encontró "${consulta}". Revisa la ortografía o completa la región.`);
  }

  const [lugar, ...alternativas] = lugares;
  const advertencias: string[] = [];
  if (alternativas.some((alt) => distanciaKm(lugar, alt) > DISTANCIA_AMBIGUA_KM)) {
    advertencias.push(
      `Hay varios lugares llamados "${ciudad}" en ${pais}. Se usó "${lugar.nombreMostrado}"; confirma cuál es el correcto (o indica la región).`,
    );
  }

  return { lugar, alternativas, advertencias };
}
