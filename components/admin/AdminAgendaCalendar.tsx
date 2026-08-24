"use client";

import { useRouter } from "next/navigation";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { toggleQuickBlockAction } from "@/app/admin/calendario/actions";

interface AdminAgendaCalendarProps {
  dates: string[];
}

/** Envoltorio cliente de CalendarGrid en modo admin — la página de
 * /admin/calendario es un Server Component y no puede usar useRouter. */
export function AdminAgendaCalendar({ dates }: AdminAgendaCalendarProps) {
  const router = useRouter();

  return (
    <CalendarGrid
      mode="admin"
      dates={dates}
      onToggleBlock={toggleQuickBlockAction}
      onViewBooking={(bookingId) => router.push(`/admin/reservas/${bookingId}`)}
    />
  );
}
