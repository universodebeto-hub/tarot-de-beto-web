import { describe, it, expect, vi } from "vitest";
import { geocodificar } from "@/server/astro/geocode";

/** Respuestas de Nominatim simuladas: los tests nunca tocan la red. */
function simular(cuerpo: unknown, status = 200) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(cuerpo), { status }));
  return { fetchImpl: fetchImpl as unknown as typeof fetch, mock: fetchImpl };
}

const CALI = { display_name: "Cali, Valle del Cauca, Colombia", lat: "3.4516", lon: "-76.5320" };

describe("geocodificar", () => {
  it("devuelve coordenadas y la zona horaria calculada por coordenadas", async () => {
    const { fetchImpl } = simular([CALI]);
    const r = await geocodificar("Cali", "Colombia", { fetchImpl });
    expect(r.lugar).toMatchObject({ lat: 3.4516, lon: -76.532, zonaHoraria: "America/Bogota" });
    expect(r.alternativas).toEqual([]);
    expect(r.advertencias).toEqual([]);
  });

  it("identifica la app con User-Agent y arma la consulta con ciudad, región y país", async () => {
    const { fetchImpl, mock } = simular([CALI]);
    await geocodificar("Cali", "Colombia", { fetchImpl, region: "Valle del Cauca" });
    const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).searchParams.get("q")).toBe("Cali, Valle del Cauca, Colombia");
    expect((init.headers as Record<string, string>)["User-Agent"]).toContain("TarotDeBeto");
  });

  it("avisa cuando hay ciudades homónimas lejanas y deja las alternativas", async () => {
    const { fetchImpl } = simular([
      { display_name: "San José, Costa Rica", lat: "9.9281", lon: "-84.0907" },
      { display_name: "San José, California, Estados Unidos", lat: "37.3382", lon: "-121.8863" },
    ]);
    const r = await geocodificar("San José", "Costa Rica", { fetchImpl });
    expect(r.lugar.nombreMostrado).toBe("San José, Costa Rica");
    expect(r.alternativas).toHaveLength(1);
    expect(r.advertencias[0]).toContain("varios lugares");
  });

  it("no avisa si los resultados extra están a menos de 50 km (mismo lugar)", async () => {
    const { fetchImpl } = simular([CALI, { display_name: "Cali (área metropolitana)", lat: "3.4800", lon: "-76.5000" }]);
    expect((await geocodificar("Cali", "Colombia", { fetchImpl })).advertencias).toEqual([]);
  });

  it("falla con un mensaje claro si no encuentra nada", async () => {
    const { fetchImpl } = simular([]);
    await expect(geocodificar("Zzzzzz", "Colombia", { fetchImpl })).rejects.toThrow(/No se encontró/);
  });

  it("falla si el servicio responde con error", async () => {
    const { fetchImpl } = simular({}, 500);
    await expect(geocodificar("Cali", "Colombia", { fetchImpl })).rejects.toThrow(/500/);
  });

  it("falla si falta la ciudad o el país, sin llamar al servicio", async () => {
    const { fetchImpl, mock } = simular([CALI]);
    await expect(geocodificar("", "Colombia", { fetchImpl })).rejects.toThrow(/Faltan/);
    await expect(geocodificar("Cali", "  ", { fetchImpl })).rejects.toThrow(/Faltan/);
    expect(mock).not.toHaveBeenCalled();
  });
});
