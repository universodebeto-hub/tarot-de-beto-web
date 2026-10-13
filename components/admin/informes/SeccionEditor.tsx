"use client";

import { useState, useTransition } from "react";
import { guardarSeccionAction, regenerarSeccionAction } from "@/app/admin/informes/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";

interface Props {
  informeId: string;
  seccionId: string;
  titulo: string;
  markdown: string;
  advertencias: string[];
  editada: boolean;
  bloqueado: boolean;
}

/** Una sección del informe: texto editable (Markdown simple), avisos de validación y regenerar con IA. */
export function SeccionEditor({ informeId, seccionId, titulo, markdown, advertencias, editada, bloqueado }: Props) {
  const [texto, setTexto] = useState(markdown);
  const [avisos, setAvisos] = useState(advertencias);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [abierta, setAbierta] = useState(false);
  const cambiado = texto.trim() !== markdown.trim();

  function guardar() {
    startTransition(async () => {
      const r = await guardarSeccionAction(informeId, seccionId, texto);
      if (r.error) setMensaje({ tipo: "error", texto: r.error });
      else {
        setAvisos(r.advertencias ?? []);
        setMensaje({ tipo: "ok", texto: "Guardado." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-bone">{titulo}</span>
          {editada ? <span className="font-mono text-[10px] uppercase tracking-wide text-gold-soft">editada a mano</span> : null}
          {avisos.length > 0 ? (
            <span className="font-mono text-[10px] uppercase tracking-wide text-ember">
              {avisos.length} {avisos.length === 1 ? "aviso" : "avisos"}
            </span>
          ) : null}
        </span>
        <span className="font-mono text-xs text-ash">{abierta ? "Cerrar" : "Revisar"}</span>
      </button>

      {abierta ? (
        <div className="flex flex-col gap-3 border-t border-white/10 p-4">
          {avisos.length > 0 ? (
            <ul className="mb-0 list-disc space-y-1 rounded-lg border border-ember/30 bg-ember/5 p-3 pl-7 text-sm text-bone-dim">
              {avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-0 text-sm text-emerald">Sin avisos de validación.</p>
          )}
          <label className="sr-only" htmlFor={`seccion-${seccionId}`}>
            Texto de {titulo}
          </label>
          <textarea
            id={`seccion-${seccionId}`}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setMensaje(null);
            }}
            disabled={bloqueado}
            rows={Math.min(24, Math.max(8, texto.split("\n").length + 2))}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm leading-relaxed text-bone outline-none focus:border-gold/50 disabled:opacity-60"
          />
          <p className="mb-0 text-xs text-ash">
            Formato: <code>### Subtítulo</code>, párrafos separados por una línea en blanco, <code>- </code> para listas,{" "}
            <code>**negrita**</code> y <code>*cursiva*</code>.
          </p>
          {mensaje ? (
            <p className={`mb-0 text-sm ${mensaje.tipo === "ok" ? "text-emerald" : "text-ember"}`} role="status">
              {mensaje.texto}
            </p>
          ) : null}
          {!bloqueado ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={guardar} disabled={pending || !cambiado} className="btn btn-gold disabled:opacity-40">
                {pending ? "Guardando…" : "Guardar cambios"}
              </button>
              <ConfirmActionButton
                label="Regenerar con IA"
                pendingLabel="Regenerando… (puede tardar)"
                confirmMessage={
                  <>
                    Se escribirá de nuevo <strong>{titulo}</strong> y <strong>se perderán</strong> los cambios que hayas hecho en esta sección.
                  </>
                }
                confirmLabel="Regenerar"
                className="btn btn-ghost"
                action={() => regenerarSeccionAction(informeId, seccionId)}
                onSettled={(r) => {
                  if (r.error) setMensaje({ tipo: "error", texto: r.error });
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
