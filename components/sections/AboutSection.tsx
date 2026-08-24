import { Reveal } from "@/components/ui/Reveal";

const VALUES = [
  {
    numeral: "I",
    title: "Honestidad",
    text: "Te digo lo que veo, aunque no siempre sea lo que esperas escuchar.",
  },
  {
    numeral: "II",
    title: "Respeto",
    text: "Tu historia se queda entre las cartas y nosotros. Sin juicios.",
  },
  {
    numeral: "III",
    title: "Cercanía",
    text: "Una consulta se siente como una conversación, no como un espectáculo.",
  },
];

interface AboutSectionProps {
  full?: boolean;
}

export function AboutSection({ full = false }: AboutSectionProps) {
  return (
    <section id="sobre-mi" className="py-[88px]">
      <div className="container mx-auto grid max-w-[1180px] items-start gap-14 px-7 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <div className="glass flex aspect-3/4 items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              className="h-24 w-24 text-gold/70"
            >
              <circle cx="50" cy="50" r="34" />
              <path d="M50 16 L50 84 M16 50 L84 50 M27 27 L73 73 M73 27 L27 73" />
            </svg>
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <span className="eyebrow">Sobre mí</span>
          <h2>
            Alberto Arango
            <br />
            <em>guía espiritual</em>
          </h2>
          <p className="text-[1.08rem] text-bone">
            Tarotista, numerólogo y guía espiritual con más de 12 años de experiencia.
          </p>

          <p>
            A lo largo de su trayectoria ha desarrollado una práctica enfocada en la orientación y el
            acompañamiento personalizado, integrando diferentes herramientas de interpretación y trabajo
            espiritual como el tarot, la numerología, la tabacomancia, la velomancia, la carta astral y las
            ritualizaciones.
          </p>

          <p>
            Cada consulta es abordada de manera individual, teniendo en cuenta la situación y las inquietudes
            de cada persona. Su propósito es ofrecer un espacio de escucha, interpretación y orientación, con
            un enfoque cercano, respetuoso y profesional.
          </p>

          {full ? (
            <p>
              Más de una década de experiencia le ha permitido construir una forma de trabajo basada en la
              discreción, la sensibilidad y el compromiso con cada consulta, entendiendo que detrás de cada
              pregunta existe una historia y una situación particular que merece ser escuchada.
            </p>
          ) : null}

          <div className="divider my-8" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {VALUES.map((value) => (
              <div key={value.numeral}>
                <span className="arcana-num mb-2 block">{value.numeral}</span>
                <h3 className="mb-1 text-base">{value.title}</h3>
                <p className="mb-0 text-sm">{value.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
