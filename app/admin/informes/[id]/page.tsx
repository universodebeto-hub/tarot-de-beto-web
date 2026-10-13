import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerInforme } from "@/server/admin/informes";
import { GlassCard } from "@/components/ui/GlassCard";
import { VALUE_TONE } from "@/components/admin/SummaryBar";
import { GenerarBorrador } from "@/components/admin/informes/GenerarBorrador";
import { SeccionEditor } from "@/components/admin/informes/SeccionEditor";
import { CorregirLugar } from "@/components/admin/informes/CorregirLugar";
import { VistaPreviaPdf } from "@/components/admin/informes/VistaPreviaPdf";
import { EntregarInforme } from "@/components/admin/informes/EntregarInforme";
import { ESTADO_INFORME_ETIQUETA, ESTADO_INFORME_TONO } from "@/lib/astro/estado-informe";
import { formatearGrado, formatearFechaLarga, descripcionHora } from "@/lib/astro/formato";
import { NOMBRE_ASPECTO, NOMBRE_PUNTO, NOMBRE_SIGNO } from "@/lib/astro/nombres";
import { SIMBOLO_PUNTO, SIMBOLO_SIGNO } from "@/lib/astro/simbolos";
import { intakeFieldsFor } from "@/lib/service-intake";

export const metadata: Metadata = { title: "Panel — Informe de carta astral", robots: { index: false } };
// Cada paso de redacción es una petición aparte, pero con IA una sola puede pasar de 10 s.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const th = "px-3 py-2 font-mono text-[10.5px] font-normal uppercase tracking-wide text-ash";
const td = "px-3 py-1.5";

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-0 text-lg">{children}</h3>;
}

export default async function AdminInformeDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const informe = await obtenerInforme(id);
  if (!informe) notFound();

  const { carta, datos, lugar } = informe;
  const entregado = informe.estado === "ENTREGADO";
  const pasosPendientes = (informe.estado === "PENDIENTE" ? 1 : 0) + informe.faltantes.length;
  const etiquetasIntake = new Map(intakeFieldsFor("carta-astral").map((f) => [f.key, f.label]));
  const avisos = [...informe.avisosLugar, ...(carta?.advertencias ?? [])];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/informes" className="font-mono text-xs uppercase tracking-wide text-gold-soft">
          ← Todos los informes
        </Link>
        <h2 className="mt-3 mb-0">{informe.cliente}</h2>
        <p className="mt-2 mb-0 text-sm text-bone-dim">
          Reserva{" "}
          <Link href={`/admin/reservas/${informe.bookingId}`} className="text-gold-soft underline">
            {informe.bookingNumber}
          </Link>
          {informe.email ? ` · ${informe.email}` : ""} ·{" "}
          <span className={VALUE_TONE[ESTADO_INFORME_TONO[informe.estado]]}>{ESTADO_INFORME_ETIQUETA[informe.estado]}</span>
          {entregado && informe.entregado
            ? ` el ${new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "America/Bogota" }).format(informe.entregado)}`
            : ""}
        </p>
      </div>

      {informe.error ? (
        <div className="rounded-xl border border-ember/40 bg-ember/10 p-4 text-sm text-bone" role="alert">
          <strong>El último paso falló:</strong> {informe.error}
        </div>
      ) : null}

      {/* 1 · Generar */}
      {!entregado ? (
        <GlassCard className="flex flex-col gap-4">
          <span className="eyebrow">1 · Borrador</span>
          {pasosPendientes > 0 ? (
            <p className="mb-0 text-sm text-bone-dim">
              El sistema calcula la carta y redacta cada sección, una por una. Puedes cerrar la página y seguir después.
            </p>
          ) : (
            <p className="mb-0 text-sm text-emerald">El borrador está completo. Revisa cada sección abajo.</p>
          )}
          {pasosPendientes > 0 ? (
            <GenerarBorrador
              informeId={informe.id}
              pasosPendientes={pasosPendientes}
              etiqueta={informe.estado === "PENDIENTE" ? "Generar borrador" : informe.error ? "Reintentar" : "Continuar el borrador"}
            />
          ) : null}
        </GlassCard>
      ) : null}

      {/* 2 · Datos y cómo se interpretaron */}
      <GlassCard className="flex flex-col gap-5">
        <span className="eyebrow">2 · Datos de nacimiento</span>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Titulo>Lo que escribió el cliente</Titulo>
            <dl className="mb-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {Object.entries(informe.intakeCrudo).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ash">{etiquetasIntake.get(k) ?? k}</dt>
                  <dd className="mb-0 text-bone">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-2">
            <Titulo>Cómo lo interpretó el sistema</Titulo>
            {datos && lugar && carta ? (
              <dl className="mb-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-ash">Nombre del informe</dt>
                <dd className="mb-0 text-bone">{datos.nombre}</dd>
                <dt className="text-ash">Fecha</dt>
                <dd className="mb-0 text-bone">{formatearFechaLarga(datos.fecha)}</dd>
                <dt className="text-ash">Hora</dt>
                <dd className="mb-0 text-bone">{descripcionHora(datos)}</dd>
                <dt className="text-ash">Lugar encontrado</dt>
                <dd className="mb-0 text-bone">{lugar.nombreMostrado}</dd>
                <dt className="text-ash">Coordenadas</dt>
                <dd className="mb-0 text-bone">
                  {lugar.lat.toFixed(4)}, {lugar.lon.toFixed(4)}
                </dd>
                <dt className="text-ash">Zona horaria</dt>
                <dd className="mb-0 text-bone">{lugar.zonaHoraria}</dd>
                <dt className="text-ash">Hora convertida a UTC</dt>
                <dd className="mb-0 text-bone">{carta.utc.replace("T", " ").replace(/\.\d+Z$|Z$/, "")} UTC</dd>
                <dt className="text-ash">Casas</dt>
                <dd className="mb-0 text-bone">{carta.casas.length === 12 ? carta.configuracion.sistemaCasas : "No se calculan (sin hora)"}</dd>
              </dl>
            ) : (
              <p className="mb-0 text-sm text-bone-dim">Se mostrará cuando se genere la carta.</p>
            )}
          </div>
        </div>
        {avisos.length > 0 ? (
          <ul className="mb-0 list-disc space-y-1 rounded-lg border border-gold/30 bg-gold/5 p-3 pl-7 text-sm text-bone-dim">
            {avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        ) : null}
        {datos && lugar && !entregado ? (
          <details className="rounded-lg border border-white/10 p-4">
            <summary className="cursor-pointer text-sm text-gold-soft">¿El lugar o la hora no coinciden? Corregir lugar</summary>
            <div className="mt-4">
              <CorregirLugar
                informeId={informe.id}
                ciudad={datos.ciudad}
                pais={datos.pais}
                region={datos.region}
                lat={lugar.lat}
                lon={lugar.lon}
                zonaHoraria={lugar.zonaHoraria}
              />
            </div>
          </details>
        ) : null}
      </GlassCard>

      {/* 3 · La carta */}
      {carta ? (
        <GlassCard className="flex flex-col gap-5">
          <span className="eyebrow">3 · La carta calculada</span>
          <p className="mb-0 text-sm text-bone-dim">
            La rueda dibujada está en la vista previa del PDF (abajo). Aquí están los números exactos.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Punto</th>
                  <th className={th}>Signo</th>
                  <th className={th}>Posición</th>
                  <th className={th}>Casa</th>
                  <th className={th}>Mov.</th>
                </tr>
              </thead>
              <tbody>
                {carta.puntos.map((p) => (
                  <tr key={p.punto} className="border-b border-white/5">
                    <td className={td}>
                      <span aria-hidden className="mr-2 text-gold-soft">{SIMBOLO_PUNTO[p.punto]}</span>
                      {NOMBRE_PUNTO[p.punto]}
                    </td>
                    <td className={td}>
                      <span aria-hidden className="mr-2 text-gold-soft">{SIMBOLO_SIGNO[p.signo]}</span>
                      {NOMBRE_SIGNO[p.signo]}
                    </td>
                    <td className={`${td} tabular-nums`}>{formatearGrado(p.grado)}</td>
                    <td className={td}>{p.casa ?? "—"}</td>
                    <td className={td}>{p.retrogrado ? "Retrógrado" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {carta.casas.length === 12 ? (
            <details>
              <summary className="cursor-pointer text-sm text-gold-soft">Cúspides de las 12 casas</summary>
              <ul className="mt-3 mb-0 grid list-none gap-x-6 gap-y-1 p-0 text-sm sm:grid-cols-2">
                {carta.casas.map((c) => (
                  <li key={c.casa} className="text-bone-dim">
                    Casa {c.casa}: <span className="text-bone">{NOMBRE_SIGNO[c.signo]} {formatearGrado(c.grado)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <details>
            <summary className="cursor-pointer text-sm text-gold-soft">Aspectos ({carta.aspectos.length})</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={th}>Punto</th>
                    <th className={th}>Aspecto</th>
                    <th className={th}>Punto</th>
                    <th className={th}>Orbe</th>
                    <th className={th}>Movimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {carta.aspectos.map((a, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className={td}>{NOMBRE_PUNTO[a.a]}</td>
                      <td className={td}>{NOMBRE_ASPECTO[a.tipo]}</td>
                      <td className={td}>{NOMBRE_PUNTO[a.b]}</td>
                      <td className={`${td} tabular-nums`}>{a.orbe.toFixed(2)}°</td>
                      <td className={td}>{a.aplicativo ? "aplicativo" : "separativo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </GlassCard>
      ) : null}

      {/* 4 · Secciones */}
      {informe.secciones.length > 0 ? (
        <GlassCard className="flex flex-col gap-4">
          <span className="eyebrow">4 · Textos del informe</span>
          <p className="mb-0 text-sm text-bone-dim">
            Abre cada sección para leerla. Los avisos señalan signos o casas que el texto menciona y no coinciden con la carta:
            revísalos antes de entregar.
          </p>
          <div className="flex flex-col gap-3">
            {informe.secciones.map((s) => (
              <SeccionEditor
                key={`${s.id}-${s.editada}-${s.markdown.length}`}
                informeId={informe.id}
                seccionId={s.id}
                titulo={s.titulo}
                markdown={s.markdown}
                advertencias={s.advertencias}
                editada={s.editada}
                bloqueado={entregado}
              />
            ))}
          </div>
          {informe.uso ? (
            <p className="mb-0 text-xs text-ash">
              Uso de IA: {informe.uso.entrada.toLocaleString("es")} tokens de entrada, {informe.uso.salida.toLocaleString("es")} de salida
              {informe.uso.costoUSD !== null ? ` · costo estimado US$ ${informe.uso.costoUSD.toFixed(2)}` : ""}.
            </p>
          ) : null}
        </GlassCard>
      ) : null}

      {/* 5 · PDF y entrega */}
      {carta ? (
        <GlassCard className="flex flex-col gap-5">
          <span className="eyebrow">5 · PDF y entrega</span>
          <VistaPreviaPdf informeId={informe.id} puedeDescargar={informe.secciones.length > 0} />
          {informe.estado === "REDACTADO" ? (
            <div className="flex flex-col gap-2 border-t border-white/10 pt-5">
              <p className="mb-0 text-sm text-bone-dim">
                Cuando hayas revisado todo y enviado el PDF al cliente por correo o WhatsApp, déjalo registrado:
              </p>
              <EntregarInforme informeId={informe.id} />
            </div>
          ) : null}
        </GlassCard>
      ) : null}
    </div>
  );
}
