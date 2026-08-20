import type { Metadata } from "next";
import { LegalArticle } from "@/components/legal/LegalArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  alternates: { canonical: "/terminos" },
  title: "Términos y condiciones",
  description: "Condiciones de uso del sitio y de las consultas de tarot ofrecidas por Alberto Arango.",
};

export default function TerminosPage() {
  return (
    <LegalArticle
      eyebrow="Legal"
      title={
        <>
          Términos y <em>condiciones</em>
        </>
      }
      intro={`Última actualización: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}.`}
      sections={[
        {
          heading: "1. Naturaleza del servicio",
          body: [
            "Las consultas de tarot ofrecidas por Alberto Arango son de carácter orientativo y espiritual — no reemplazan asesoría médica, legal, financiera o psicológica profesional.",
          ],
        },
        {
          heading: "2. Reservas y pagos",
          body: [
            `Las reservas se confirman una vez recibido el pago a través de PayPal. Los precios se muestran en ${siteConfig.currency} y pueden cambiar sin previo aviso para reservas futuras.`,
            "Una reserva sin pago completado dentro de la ventana indicada se libera automáticamente y el horario vuelve a estar disponible.",
          ],
        },
        {
          heading: "3. Cuentas de usuario",
          body: [
            "Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra bajo tu cuenta.",
          ],
        },
        {
          heading: "4. Uso aceptable",
          body: [
            "No está permitido usar el sitio para fines fraudulentos, ni intentar acceder a cuentas o datos de otras personas.",
          ],
        },
        {
          heading: "5. Cambios a estos términos",
          body: [
            "Podemos actualizar estos términos ocasionalmente. Los cambios aplican a reservas hechas después de la fecha de actualización.",
          ],
        },
      ]}
    />
  );
}
