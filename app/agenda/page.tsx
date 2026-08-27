import { redirect } from "next/navigation";

/** La reserva con fecha/hora fija se eliminó — todas las consultas con tarotista pasan por la consulta instantánea (/tarotistas/[slug]). */
export default function AgendaPage() {
  redirect("/tarotistas");
}
