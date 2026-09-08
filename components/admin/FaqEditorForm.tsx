"use client";

import { useState, useTransition } from "react";
import { updateFaqItemsAction } from "@/app/admin/configuracion/actions";
import { TrashIcon } from "@/components/ui/icons";
import type { FaqItem } from "@/types/content";

/** Lista de preguntas/respuestas con un campo por dato -- agregar/editar/borrar sin tocar JSON. */
export function FaqEditorForm({ initial }: { initial: FaqItem[] }) {
  const [items, setItems] = useState<FaqItem[]>(initial.length > 0 ? initial : [{ question: "", answer: "" }]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateItem(index: number, field: keyof FaqItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { question: "", answer: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateFaqItemsAction(items);
      setMessage(result.error ?? "Guardado.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Pregunta {index + 1}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              title="Eliminar esta pregunta"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ember/30 text-ember hover:border-ember hover:bg-ember/10"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Pregunta
            <input
              type="text"
              value={item.question}
              onChange={(e) => updateItem(index, "question", e.target.value)}
              className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Respuesta
            <textarea
              rows={3}
              value={item.answer}
              onChange={(e) => updateItem(index, "answer", e.target.value)}
              className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
            />
          </label>
        </div>
      ))}

      <button type="button" onClick={addItem} className="btn btn-ghost self-start">
        + Agregar pregunta
      </button>

      <div className="flex items-center gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={handleSave} disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar preguntas frecuentes"}
        </button>
        {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
      </div>
    </div>
  );
}
