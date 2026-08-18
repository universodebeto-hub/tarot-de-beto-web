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
            Soy tarotista, guía espiritual, terapeuta holístico y espiritista, con más de 12 años de
            experiencia acompañando procesos de amor, trabajo y camino de vida a través del tarot y otros
            trabajos espirituales.
          </p>

          <p>
            No trabajo con predicciones cerradas ni con miedo. Cada consulta es un espacio de conversación
            honesta: las cartas y los trabajos espirituales abren preguntas, y en esas preguntas aparece la
            claridad que la persona ya traía consigo.
          </p>

          <p>
            Leo con cercanía, en un lenguaje sencillo, sin tecnicismos ni promesas vacías. Mi trabajo no es
            decirte qué hacer — es ayudarte a ver con más nitidez para que la decisión sea tuya.
          </p>

          {full ? (
            <p>
              Las consultas se realizan por videollamada o llamada, según la modalidad disponible para cada
              servicio. La atención es siempre personalizada: un espacio dedicado a tu pregunta, sin prisa.
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
