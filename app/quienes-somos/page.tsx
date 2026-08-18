import type { Metadata } from "next";
import { AboutSection } from "@/components/sections/AboutSection";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Conoce a Alberto Arango, tarotista y guía espiritual con más de 12 años de experiencia.",
};

export default function QuienesSomosPage() {
  return (
    <>
      <div className="container mx-auto max-w-[1180px] px-7 pt-14">
        <span className="eyebrow">Quiénes somos</span>
        <h1 className="mt-3 max-w-2xl">
          Una consulta cercana, <em>no un espectáculo</em>
        </h1>
      </div>
      <AboutSection full />
      <CTASection
        eyebrow="¿Lista tu pregunta?"
        title={
          <>
            Empecemos con una <em>consulta</em>
          </>
        }
        href="/servicios"
        cta="Ver servicios"
      />
    </>
  );
}
