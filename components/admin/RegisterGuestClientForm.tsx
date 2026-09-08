"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerGuestAsClientAction } from "@/app/admin/reservas/[id]/actions";

interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
}

/**
 * Convierte una reserva de invitado en cliente registrado (sin contraseña
 * -- queda pendiente de que la persona la reclame, ver
 * server/admin/clients.ts::registerGuestAsClient) -- para cuando Beto ya
 * tiene el correo/datos de PayPal y no quiere esperar a que se registre
 * sola.
 */
export function RegisterGuestClientForm({ bookingId, guestName, guestEmail, guestPhone }: {
  bookingId: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<GuestData>(() => {
    const [firstName, ...rest] = (guestName ?? "").trim().split(/\s+/);
    return {
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      email: guestEmail ?? "",
      phone: guestPhone ?? "",
      country: "",
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof GuestData>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await registerGuestAsClientAction(bookingId, data);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 text-xs text-gold-soft hover:text-gold">
        + Registrar como cliente
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2.5 rounded-lg border border-gold/20 bg-obsidian/40 p-3">
      <p className="mb-0 text-xs text-ash">
        Crea la cuenta con estos datos (sin contraseña) para que aparezca en Clientes. Si la persona después se
        registra sola con el mismo correo, toma posesión de esta misma cuenta -- no queda duplicada.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={data.firstName}
          onChange={(e) => update("firstName", e.target.value)}
          placeholder="Nombre"
          className="rounded-md border border-white/15 bg-obsidian/60 px-2.5 py-1.5 text-xs text-bone"
        />
        <input
          value={data.lastName}
          onChange={(e) => update("lastName", e.target.value)}
          placeholder="Apellido"
          className="rounded-md border border-white/15 bg-obsidian/60 px-2.5 py-1.5 text-xs text-bone"
        />
        <input
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="Correo"
          type="email"
          className="col-span-2 rounded-md border border-white/15 bg-obsidian/60 px-2.5 py-1.5 text-xs text-bone"
        />
        <input
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="WhatsApp (opcional)"
          className="rounded-md border border-white/15 bg-obsidian/60 px-2.5 py-1.5 text-xs text-bone"
        />
        <input
          value={data.country}
          onChange={(e) => update("country", e.target.value)}
          placeholder="País (opcional)"
          className="rounded-md border border-white/15 bg-obsidian/60 px-2.5 py-1.5 text-xs text-bone"
        />
      </div>
      {error ? <p className="mb-0 text-xs text-ember">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !data.firstName.trim() || !data.email.trim()}
          className="btn btn-gold px-3 py-1.5 text-xs disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Registrar cliente"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-3 py-1.5 text-xs">
          Cancelar
        </button>
      </div>
    </div>
  );
}
