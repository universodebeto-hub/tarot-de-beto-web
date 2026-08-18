import { Reveal } from "@/components/ui/Reveal";

const STEPS = [
  {
    numeral: "0",
    title: "Elige tu consulta",
    text: "Escoge el servicio y la duración que mejor se ajusten a tu pregunta.",
  },
  {
    numeral: "I",
    title: "Reserva tu horario",
    text: "Elige fecha y hora disponible, y confirma tus datos en minutos.",
  },
  {
    numeral: "II",
    title: "Habla con Beto",
    text: "Recibe tu consulta por videollamada o llamada, con toda tu privacidad.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <Reveal as="div" className="section-head mb-12 max-w-[620px]">
          <span className="eyebrow">Cómo funciona</span>
          <h2>
            Tres pasos hacia <em>tu claridad</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Reveal key={step.numeral}>
              <span className="arcana-num mb-3.5 block">{step.numeral}</span>
              <h3 className="mb-2">{step.title}</h3>
              <p className="mb-0 text-sm">{step.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
