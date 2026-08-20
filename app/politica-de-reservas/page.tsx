import type { Metadata } from "next";
import { LegalArticle } from "@/components/legal/LegalArticle";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/politica-de-reservas" },
  title: "Política de reservas y cancelación",
  description: "Cómo funcionan la ventana de pago, la reprogramación y la cancelación de tu consulta.",
};

export default async function PoliticaDeReservasPage() {
  const paymentWindowMinutes = await getSetting<number>("booking_payment_window_minutes", 15);

  return (
    <LegalArticle
      eyebrow="Legal"
      title={
        <>
          Política de <em>reservas y cancelación</em>
        </>
      }
      sections={[
        {
          heading: "1. Ventana de pago",
          body: [
            `Al elegir un horario, lo reservamos temporalmente por ${paymentWindowMinutes} minutos mientras completas el pago. Si el pago no se completa a tiempo, la reserva se libera automáticamente y el horario vuelve a estar disponible para otras personas.`,
          ],
        },
        {
          heading: "2. Confirmación",
          body: [
            "Tu consulta queda confirmada solo cuando el pago se verifica correctamente contra PayPal — recibirás un correo de confirmación con el número de tu reserva.",
          ],
        },
        {
          heading: "3. Reprogramación",
          body: [
            "Si necesitas cambiar la fecha u hora de tu consulta, escríbenos por WhatsApp con tu número de reserva con al menos unas horas de anticipación, y buscaremos el horario más cercano disponible.",
          ],
        },
        {
          heading: "4. Cancelación y reembolsos",
          body: [
            "Puedes solicitar la cancelación de tu consulta escribiendo por WhatsApp con tu número de reserva. Las condiciones de reembolso se evalúan caso por caso según cuánto falte para el horario agendado — este texto de ejemplo debe reemplazarse por la política real que Alberto quiera ofrecer (ej. reembolso completo con 24h de anticipación, parcial después, etc.).",
          ],
        },
        {
          heading: "5. Inasistencia",
          body: [
            "Si no te presentas a la consulta confirmada sin avisar, la consulta se considera realizada y no aplica reembolso.",
          ],
        },
      ]}
    />
  );
}
