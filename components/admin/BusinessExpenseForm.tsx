"use client";

import { useState, useTransition } from "react";
import { addExpenseAction, deleteExpenseAction } from "@/app/admin/contabilidad/actions";
import { TrashIcon } from "@/components/ui/icons";

export interface ExpenseRow {
  id: string;
  description: string;
  amountUsd: number;
  category: string | null;
  incurredAt: string;
}

/** Alta y borrado de gastos operativos (suscripciones, herramientas, etc.) -- se restan del ingreso neto para el balance de ganancias. */
export function BusinessExpenseForm({ expenses }: { expenses: ExpenseRow[] }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    setMessage(null);
    startTransition(async () => {
      const result = await addExpenseAction({
        description,
        amountUsd: Number(amount),
        category: category.trim() || undefined,
      });
      if (result.error) {
        setMessage(result.error);
      } else {
        setDescription("");
        setAmount("");
        setCategory("");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpenseAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="mb-0 text-sm text-bone-dim">
        Gastos del negocio (suscripciones, herramientas, comisiones que no sean de PayPal) -- se restan del ingreso
        neto para calcular la ganancia real.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Suscripción a Vercel"
            className="w-56 rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Monto (USD)
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Categoría (opcional)
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ej. Herramientas"
            className="w-40 rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !description.trim() || !amount}
          className="btn btn-gold disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Agregar gasto"}
        </button>
      </div>
      {message ? <p className="mb-0 text-sm text-ember">{message}</p> : null}

      {expenses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ash">
                <th className="py-1.5 pr-4">Fecha</th>
                <th className="py-1.5 pr-4">Descripción</th>
                <th className="py-1.5 pr-4">Categoría</th>
                <th className="py-1.5 pr-4">Monto</th>
                <th className="py-1.5 pr-4" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-bone-dim">{new Date(e.incurredAt).toLocaleDateString("es-CO")}</td>
                  <td className="py-2 pr-4 text-bone">{e.description}</td>
                  <td className="py-2 pr-4 text-bone-dim">{e.category ?? "—"}</td>
                  <td className="py-2 pr-4 text-bone-dim">${e.amountUsd.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      title="Eliminar gasto"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ember/30 text-ember hover:border-ember hover:bg-ember/10"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-0 text-sm text-ash">Todavía no cargaste ningún gasto.</p>
      )}
    </div>
  );
}
