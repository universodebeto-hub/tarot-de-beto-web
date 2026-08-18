import type { Metadata } from "next";
import { FAQSection } from "@/components/sections/FAQSection";
import { faqItems } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Resolvemos las dudas más comunes sobre las consultas de tarot de Alberto Arango.",
};

export default function FaqPage() {
  return (
    <div className="pt-14">
      <div className="container mx-auto max-w-[1180px] px-7">
        <span className="eyebrow">Preguntas frecuentes</span>
        <h1 className="mt-3 max-w-2xl">
          Todo lo que necesitas <em>saber antes de reservar</em>
        </h1>
      </div>
      <FAQSection items={faqItems} />
    </div>
  );
}
