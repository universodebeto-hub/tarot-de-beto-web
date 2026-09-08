"use client";

import { useState, useTransition } from "react";
import { updateManualPaymentInstructionsAction } from "@/app/admin/configuracion/actions";
import type { ManualPaymentInstructions } from "@/server/settings";

interface FieldSpec {
  key: string;
  label: string;
}

interface MethodSpec {
  key: keyof ManualPaymentInstructions;
  title: string;
  fields: FieldSpec[];
}

const METHODS: MethodSpec[] = [
  {
    key: "pagoMovil",
    title: "Pago Móvil",
    fields: [
      { key: "telefono", label: "Teléfono" },
      { key: "cedula", label: "Cédula / RIF" },
      { key: "banco", label: "Banco" },
    ],
  },
  {
    key: "zelle",
    title: "Zelle",
    fields: [
      { key: "correo", label: "Correo" },
      { key: "nombre", label: "Nombre del titular" },
    ],
  },
  {
    key: "binance",
    title: "Binance Pay",
    fields: [
      { key: "id", label: "Binance Pay ID" },
      { key: "correo", label: "Correo" },
    ],
  },
  {
    key: "bancolombia",
    title: "Bancolombia",
    fields: [
      { key: "tipoCuenta", label: "Tipo de cuenta" },
      { key: "numeroCuenta", label: "Número de cuenta" },
      { key: "titular", label: "Titular" },
      { key: "cedulaONit", label: "Cédula / NIT" },
    ],
  },
  {
    key: "remitly",
    title: "Remitly",
    fields: [
      { key: "nombre", label: "Nombre del destinatario" },
      { key: "pais", label: "País" },
      { key: "telefono", label: "Teléfono" },
    ],
  },
  {
    key: "westernUnion",
    title: "Western Union",
    fields: [
      { key: "nombre", label: "Nombre del destinatario" },
      { key: "pais", label: "País" },
      { key: "telefono", label: "Teléfono" },
    ],
  },
  {
    key: "moneygram",
    title: "MoneyGram",
    fields: [
      { key: "nombre", label: "Nombre del destinatario" },
      { key: "pais", label: "País" },
      { key: "telefono", label: "Teléfono" },
    ],
  },
];

/** Un campo de texto por dato de cuenta (teléfono, cédula, banco, ...) en vez de un bloque de JSON -- guarda los 7 métodos de una vez. */
export function ManualPaymentInstructionsForm({ initial }: { initial: ManualPaymentInstructions }) {
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setField(methodKey: keyof ManualPaymentInstructions, fieldKey: string, value: string) {
    setData((prev) => ({
      ...prev,
      [methodKey]: { ...prev[methodKey], [fieldKey]: value },
    }));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateManualPaymentInstructionsAction(data);
      setMessage(result.error ?? "Guardado.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {METHODS.map((method) => (
          <div key={method.key} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <span className="eyebrow">{method.title}</span>
            {method.fields.map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-sm">
                {field.label}
                <input
                  type="text"
                  value={(data[method.key] as Record<string, string>)[field.key] ?? ""}
                  onChange={(e) => setField(method.key, field.key, e.target.value)}
                  className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
                />
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar datos de pago"}
        </button>
        {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
      </div>
    </div>
  );
}
