import type { Metadata } from "next";
import { ContactSection } from "@/components/sections/ContactSection";
import { ContactForm } from "@/components/sections/ContactForm";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contacta a Alberto Arango por WhatsApp, redes sociales o el formulario de contacto.",
};

export default function ContactoPage() {
  return (
    <>
      <section className="pb-6 pt-14">
        <div className="container mx-auto max-w-[1180px] px-7">
          <span className="eyebrow">Contacto</span>
          <h1 className="mt-3 max-w-2xl">
            Escríbenos, <em>hablemos de tu consulta</em>
          </h1>
          <p className="max-w-[52ch] text-[1.05rem]">
            La vía más rápida es WhatsApp. También puedes dejarnos tu mensaje aquí y te contactamos apenas
            lo veamos.
          </p>
        </div>
      </section>

      <section className="pb-[88px] pt-0">
        <div className="container mx-auto max-w-[1180px] px-7">
          <Reveal className="mx-auto max-w-xl">
            <ContactForm whatsappNumber={siteConfig.contact.whatsappNumber} />
          </Reveal>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
