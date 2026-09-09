"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/booking-labels";
import { BOOKING_STATUS_TONE, PAYMENT_STATUS_TONE } from "@/lib/status-tone";
import { ICON_BTN_NEUTRAL, ICON_BTN_DANGER } from "@/lib/admin-ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { XCircleIcon, TrashIcon } from "@/components/ui/icons";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { changeBookingStatusFormAction, deleteBookingFromListAction } from "@/app/admin/reservas/[id]/actions";
import { bulkCancelBookingsAction, bulkDeleteBookingsAction } from "@/app/admin/reservas/actions";
import type { BookingStatus, PaymentStatus } from "@prisma/client";

export interface BookingRow {
  id: string;
  bookingNumber: string;
  clientName: string;
  serviceName: string;
  tarotistaName: string | null;
  dateLabel: string;
  /** Timestamp (ms) para poder ordenar por fecha sin pasar objetos Date por la frontera server/client. */
  startsAtMs: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
}

const CANCELLABLE_STATUSES: BookingStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "RESCHEDULE_REQUESTED"];

type SortKey = "fecha" | "cliente" | "estado";
type SortDir = "asc" | "desc";

const SORTERS: Record<SortKey, (row: BookingRow) => string | number> = {
  fecha: (row) => row.startsAtMs,
  cliente: (row) => row.clientName.toLowerCase(),
  estado: (row) => row.status,
};

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
        active ? "text-gold-soft" : "text-ash hover:text-bone-dim"
      }`}
    >
      {label}
      {active ? <span className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span> : null}
    </button>
  );
}

/** Tabla de reservas con orden por columna, selección múltiple + acciones en lote, y una vista de tarjetas en pantallas chicas. Recibe filas ya planas (sin Decimal/Date de Prisma) porque cruza la frontera server/client. */
export function BookingsTable({ rows }: { rows: BookingRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const va = SORTERS[sortKey](a);
      const vb = SORTERS[sortKey](b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((r) => r.id))));
  }

  const selectedIds = Array.from(selected);
  const selectedCancellable = selectedIds.filter((id) => {
    const row = rows.find((r) => r.id === id);
    return row && CANCELLABLE_STATUSES.includes(row.status);
  });

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 ? (
        <div className="glass no-print flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
          <span className="text-sm text-bone">{selected.size} seleccionada{selected.size === 1 ? "" : "s"}</span>
          {selectedCancellable.length > 0 ? (
            <ConfirmActionButton
              label={`Cancelar (${selectedCancellable.length})`}
              pendingLabel="Cancelando…"
              confirmLabel="Sí, cancelar"
              confirmMessage={`¿Cancelar ${selectedCancellable.length} reserva(s) seleccionada(s)? Quedan anuladas pero los registros se conservan.`}
              action={() => bulkCancelBookingsAction(selectedCancellable)}
              onSettled={(r) => {
                setBulkMessage(r?.error ?? `Se cancelaron ${r?.count ?? 0} reserva(s).`);
                setSelected(new Set());
              }}
              className="rounded-md border border-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-bone-dim hover:border-gold/30 hover:text-gold-soft"
            />
          ) : null}
          <ConfirmActionButton
            label={`Eliminar (${selected.size})`}
            pendingLabel="Eliminando…"
            tone="danger"
            confirmLabel="Sí, eliminar"
            confirmMessage={`¿Eliminar por completo ${selected.size} reserva(s) seleccionada(s)? No se puede deshacer.`}
            action={() => bulkDeleteBookingsAction(selectedIds)}
            onSettled={(r) => {
              setBulkMessage(r?.error ?? `Se eliminaron ${r?.count ?? 0} reserva(s).`);
              setSelected(new Set());
            }}
            className="rounded-md border border-ember/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-ember hover:border-ember hover:bg-ember/10"
          />
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-ash hover:text-bone-dim">
            Deseleccionar todo
          </button>
        </div>
      ) : bulkMessage ? (
        <p className="mb-0 text-sm text-bone-dim">{bulkMessage}</p>
      ) : null}

      {/* Tabla -- pantallas medianas en adelante (y siempre al imprimir, sin importar el ancho de página). */}
      <div className="hidden overflow-x-auto md:block print:block">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="w-8 py-2 pr-2 no-print">
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === sorted.length}
                  onChange={toggleAll}
                  aria-label="Seleccionar todas"
                  className="h-4 w-4 accent-gold"
                />
              </th>
              <th className="py-2 pr-4 font-mono text-[11px] uppercase tracking-wide text-ash">#</th>
              <th className="py-2 pr-4">
                <SortHeader label="Cliente" sortKey="cliente" active={sortKey === "cliente"} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="py-2 pr-4 font-mono text-[11px] uppercase tracking-wide text-ash">Servicio</th>
              <th className="py-2 pr-4">
                <SortHeader label="Fecha" sortKey="fecha" active={sortKey === "fecha"} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="py-2 pr-4">
                <SortHeader label="Estado" sortKey="estado" active={sortKey === "estado"} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="py-2 pr-4 font-mono text-[11px] uppercase tracking-wide text-ash">Pago</th>
              <th className="py-2 pr-4 font-mono text-[11px] uppercase tracking-wide text-ash no-print">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} className={`border-b border-white/5 hover:bg-white/5 ${selected.has(b.id) ? "bg-gold/[0.04]" : ""}`}>
                <td className="py-2.5 pr-2 no-print">
                  <input
                    type="checkbox"
                    checked={selected.has(b.id)}
                    onChange={() => toggleRow(b.id)}
                    aria-label={`Seleccionar ${b.bookingNumber}`}
                    className="h-4 w-4 accent-gold"
                  />
                </td>
                <td className="py-2.5 pr-4">
                  <Link href={`/admin/reservas/${b.id}`} className="text-gold-soft hover:text-gold">
                    {b.bookingNumber}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-bone">{b.clientName}</td>
                <td className="py-2.5 pr-4 text-bone-dim">
                  {b.serviceName}
                  {b.tarotistaName ? <span className="text-ash"> · {b.tarotistaName}</span> : null}
                </td>
                <td className="py-2.5 pr-4 text-bone-dim">{b.dateLabel}</td>
                <td className="py-2.5 pr-4">
                  <StatusBadge label={BOOKING_STATUS_LABEL[b.status]} tone={BOOKING_STATUS_TONE[b.status]} />
                </td>
                <td className="py-2.5 pr-4">
                  <StatusBadge label={PAYMENT_STATUS_LABEL[b.paymentStatus]} tone={PAYMENT_STATUS_TONE[b.paymentStatus]} />
                </td>
                <td className="py-2.5 pr-4 no-print">
                  <div className="flex flex-wrap items-center gap-2">
                    {CANCELLABLE_STATUSES.includes(b.status) ? (
                      <ConfirmActionButton
                        label=""
                        icon={<XCircleIcon />}
                        title="Cancelar"
                        pendingLabel=""
                        confirmLabel="Sí, cancelar"
                        confirmMessage={`¿Cancelar la reserva #${b.bookingNumber}? Queda anulada pero el registro se conserva.`}
                        action={changeBookingStatusFormAction.bind(null, b.id, "CANCELLED")}
                        className={ICON_BTN_NEUTRAL}
                      />
                    ) : null}
                    <ConfirmActionButton
                      label=""
                      icon={<TrashIcon />}
                      title="Eliminar"
                      pendingLabel=""
                      tone="danger"
                      confirmLabel="Sí, eliminar"
                      confirmMessage={`¿Eliminar por completo la reserva #${b.bookingNumber}? No se puede deshacer.`}
                      action={deleteBookingFromListAction.bind(null, b.id)}
                      className={ICON_BTN_DANGER}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas -- pantallas chicas (celular); nunca en la vista de impresión, siempre se imprime la tabla. */}
      <div className="no-print flex flex-col gap-3 md:hidden">
        {sorted.map((b) => (
          <div key={b.id} className={`glass flex flex-col gap-3 rounded-xl p-4 ${selected.has(b.id) ? "border border-gold/30" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => toggleRow(b.id)}
                  aria-label={`Seleccionar ${b.bookingNumber}`}
                  className="mt-1 h-4 w-4 accent-gold"
                />
                <div>
                  <Link href={`/admin/reservas/${b.id}`} className="text-sm text-gold-soft hover:text-gold">
                    {b.bookingNumber}
                  </Link>
                  <p className="mb-0 text-sm text-bone">{b.clientName}</p>
                  <p className="mb-0 text-xs text-ash">
                    {b.serviceName}
                    {b.tarotistaName ? ` · ${b.tarotistaName}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge label={BOOKING_STATUS_LABEL[b.status]} tone={BOOKING_STATUS_TONE[b.status]} />
                <StatusBadge label={PAYMENT_STATUS_LABEL[b.paymentStatus]} tone={PAYMENT_STATUS_TONE[b.paymentStatus]} />
              </div>
            </div>
            <p className="mb-0 text-xs text-ash">{b.dateLabel}</p>
            <div className="flex items-center gap-2 border-t border-white/10 pt-3">
              {CANCELLABLE_STATUSES.includes(b.status) ? (
                <ConfirmActionButton
                  label="Cancelar"
                  icon={<XCircleIcon className="h-4 w-4" />}
                  pendingLabel="…"
                  confirmLabel="Sí, cancelar"
                  confirmMessage={`¿Cancelar la reserva #${b.bookingNumber}? Queda anulada pero el registro se conserva.`}
                  action={changeBookingStatusFormAction.bind(null, b.id, "CANCELLED")}
                  className="flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-bone-dim"
                />
              ) : null}
              <ConfirmActionButton
                label="Eliminar"
                icon={<TrashIcon className="h-4 w-4" />}
                pendingLabel="…"
                tone="danger"
                confirmLabel="Sí, eliminar"
                confirmMessage={`¿Eliminar por completo la reserva #${b.bookingNumber}? No se puede deshacer.`}
                action={deleteBookingFromListAction.bind(null, b.id)}
                className="flex items-center gap-1.5 rounded-md border border-ember/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-ember"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
