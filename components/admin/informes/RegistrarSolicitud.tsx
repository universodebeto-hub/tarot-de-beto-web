"use client";

import { useState, useTransition } from "react";
import { registrarSolicitudAction } from "@/app/admin/informes/actions";
import { intakeFieldRequired, intakeFieldsFor } from "@/lib/service-intake";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash";

const METODOS = [
  ["PAGO_MOVIL", "Pago Móvil"],
  ["ZELLE", "Zelle"],
  ["BINANCE", "Binance Pay"],
  ["PAYPAL", "PayPal"],
  ["BANCOLOMBIA", "Bancolombia"],
  ["REMITLY", "Remitly"],
  ["WESTERN_UNION", "Western Union"],
  ["MONEYGRAM", "MoneyGram"],
  ["CORTESIA", "Sin cobro (cortesía)"],
] as const;

type Metodo = (typeof METODOS)[number][0];

/** Para quien no compra por la web: registra la solicitud ya pagada y abre su informe. */
export function RegistrarSolicitud() {
  const campos = intakeFieldsFor("carta-astral");
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("PAGO_MOVIL");
  const [referencia, setReferencia] = useState("");
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await registrarSolicitudAction({ nombre, email, telefono, metodoPago: metodo, referencia, datos });
      if (r?.error) setError(r.error);
    });
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn btn-gold self-start">
        + Registrar solicitud manual
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="mb-0 text-sm text-bone-dim">
        Para alguien que no compró por la web (te escribió por WhatsApp, pagó en persona…). Se crea la reserva ya pagada y no se le envía ningún aviso.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="sm-nombre">
            Nombre del cliente
          </label>
          <input id="sm-nombre" required className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sm-email">
            Correo (opcional)
          </label>
          <input id="sm-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sm-tel">
            Teléfono / WhatsApp (opcional)
          </label>
          <input id="sm-tel" className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sm-metodo">
            Cómo pagó
          </label>
          <select id="sm-metodo" className={inputClass} value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
            {METODOS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="sm-ref">
            Referencia del pago (opcional)
          </label>
          <input id="sm-ref" className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </div>
      </div>

      <span className="eyebrow">Datos de nacimiento</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {campos.map((c) => {
          const requerido = intakeFieldRequired(c, datos);
          const id = `sm-${c.key}`;
          const comun = { id, required: requerido, className: inputClass, value: datos[c.key] ?? "" };
          const cambiar = (v: string) => setDatos((p) => ({ ...p, [c.key]: v }));
          return (
            <div key={c.key}>
              <label className={labelClass} htmlFor={id}>
                {c.label}
                {requerido ? "" : " (opcional)"}
              </label>
              {c.type === "select" ? (
                <select {...comun} onChange={(e) => cambiar(e.target.value)}>
                  <option value="">Elige una opción</option>
                  {c.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input {...comun} type={c.type} onChange={(e) => cambiar(e.target.value)} />
              )}
              {c.hint ? <p className="mb-0 mt-1 text-xs text-ash">{c.hint}</p> : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mb-0 text-sm text-ember" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-gold disabled:opacity-40">
          {pending ? "Registrando…" : "Registrar y abrir el informe"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} disabled={pending} className="btn btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
