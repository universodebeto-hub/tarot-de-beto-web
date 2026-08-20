import type { Metadata } from "next";
import { LegalArticle } from "@/components/legal/LegalArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  alternates: { canonical: "/privacidad" },
  title: "Política de privacidad",
  description: "Cómo se recopilan, usan y protegen tus datos al reservar o registrarte en el sitio.",
};

export default function PrivacidadPage() {
  return (
    <LegalArticle
      eyebrow="Legal"
      title={
        <>
          Política de <em>privacidad</em>
        </>
      }
      intro={`Última actualización: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}.`}
      sections={[
        {
          heading: "1. Qué datos recopilamos",
          body: [
            "Cuando creas una cuenta o reservas una consulta, recopilamos tu nombre, correo electrónico, número de WhatsApp/teléfono y, si aplica, tu país.",
            "Al pagar con PayPal, la transacción la procesa PayPal directamente — no almacenamos números de tarjeta ni credenciales de tu cuenta de PayPal.",
          ],
        },
        {
          heading: "2. Para qué los usamos",
          body: [
            "Para gestionar tu reserva (confirmaciones, recordatorios, cambios de horario) y para contactarte por email o WhatsApp sobre tu consulta.",
            "No vendemos ni compartimos tus datos con terceros para fines publicitarios.",
          ],
        },
        {
          heading: "3. Cuánto tiempo los conservamos",
          body: [
            `Mientras tu cuenta esté activa, o el tiempo que exija la ley aplicable para registros de transacciones. Puedes solicitar la eliminación de tu cuenta escribiendo a ${siteConfig.contact.email || "nuestro correo de contacto"}.`,
          ],
        },
        {
          heading: "4. Tus derechos",
          body: [
            "Puedes solicitar acceso, corrección o eliminación de tus datos personales en cualquier momento. Responderemos en un plazo razonable.",
          ],
        },
        {
          heading: "5. Cookies",
          body: [
            "Usamos una cookie técnica (httpOnly) para mantener tu sesión iniciada. Si la analítica opcional (Google Analytics, Meta Pixel, TikTok Pixel) está activada, esos servicios pueden usar sus propias cookies según sus políticas.",
          ],
        },
      ]}
    />
  );
}
