import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faqItems } from "../lib/sample-data";

const prisma = new PrismaClient();

/** Contraseña de ambos usuarios de prueba (solo desarrollo). */
const TEST_PASSWORD = "Tarot2026!";

/**
 * Estructura oficial del catálogo (comando "CONFIGURAR ESTRUCTURA DEL
 * CATÁLOGO"): tres categorías — "Lecturas de Tarot", "Rituales Energéticos",
 * "Otros" — no agregar categorías nuevas ni mover servicios entre ellas.
 *
 * Contenido (comando "completar información de los productos"): las
 * descripciones de todo el catálogo y los precios de Rituales Energéticos
 * quedaron definidos por ese comando. "Informe Numerológico", "Tabacos" y
 * "Carta Astral" siguen sin precio definitivo a propósito — no inventarlo.
 * `available` de Rituales/Otros se deja como estaba (no es parte de ese
 * comando, que fue solo sobre contenido informativo, no sobre activar
 * reservas online para ellos).
 */
const CATEGORY_LECTURAS = "Lecturas de Tarot";
const CATEGORY_RITUALES = "Rituales Energéticos";
const CATEGORY_OTROS = "Otros";

async function main() {
  // --- 1. Lecturas de Tarot ---
  await prisma.service.upsert({
    where: { slug: "consulta-pregunta-tarot" },
    update: {
      name: "Consulta / Pregunta de Tarot",
      description:
        "Consulta puntual enfocada en una única pregunta. La lectura se realiza exclusivamente sobre el tema planteado y la respuesta se entrega mediante un audio personalizado con la interpretación de las cartas.",
      category: CATEGORY_LECTURAS,
      price: 3,
      currency: "USD",
      sortOrder: 0,
    },
    create: {
      slug: "consulta-pregunta-tarot",
      name: "Consulta / Pregunta de Tarot",
      description:
        "Consulta puntual enfocada en una única pregunta. La lectura se realiza exclusivamente sobre el tema planteado y la respuesta se entrega mediante un audio personalizado con la interpretación de las cartas.",
      // Duración no especificada en el comando de catálogo — se usa el
      // mínimo razonable para el ítem más corto/económico del catálogo;
      // ajustar si Beto quiere un valor distinto.
      durationMinutes: 10,
      price: 3,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: CATEGORY_LECTURAS,
      sortOrder: 0,
    },
  });

  await prisma.service.upsert({
    where: { slug: "consulta-15-minutos" },
    update: {
      name: "Lectura de Tarot — 15 minutos",
      description:
        "Lectura de tarot personalizada realizada mediante llamada. Permite abordar una situación concreta y profundizar en temas específicos como amor, relaciones, decisiones, trabajo, proyectos o situaciones personales.",
      category: CATEGORY_LECTURAS,
      sortOrder: 1,
    },
    create: {
      slug: "consulta-15-minutos",
      name: "Lectura de Tarot — 15 minutos",
      description:
        "Lectura de tarot personalizada realizada mediante llamada. Permite abordar una situación concreta y profundizar en temas específicos como amor, relaciones, decisiones, trabajo, proyectos o situaciones personales.",
      durationMinutes: 15,
      price: 10,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: CATEGORY_LECTURAS,
      sortOrder: 1,
    },
  });

  await prisma.service.upsert({
    where: { slug: "consulta-30-minutos" },
    update: {
      name: "Lectura de Tarot — 30 minutos",
      description:
        "Lectura de tarot personalizada mediante llamada, con mayor profundidad que la sesión de 15 minutos. El tiempo disponible permite explorar con más detalle una situación, abordar distintos aspectos relacionados con ella y realizar varias preguntas según el desarrollo de la consulta.",
      category: CATEGORY_LECTURAS,
      sortOrder: 2,
    },
    create: {
      slug: "consulta-30-minutos",
      name: "Lectura de Tarot — 30 minutos",
      description:
        "Lectura de tarot personalizada mediante llamada, con mayor profundidad que la sesión de 15 minutos. El tiempo disponible permite explorar con más detalle una situación, abordar distintos aspectos relacionados con ella y realizar varias preguntas según el desarrollo de la consulta.",
      durationMinutes: 30,
      price: 20,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: CATEGORY_LECTURAS,
      sortOrder: 2,
    },
  });

  await prisma.service.upsert({
    where: { slug: "consulta-60-minutos" },
    update: {
      name: "Lectura de Tarot — 1 hora",
      description:
        "Lectura de tarot personalizada mediante llamada, en la modalidad de mayor duración y profundidad. Permite desarrollar ampliamente diferentes situaciones, realizar varias preguntas y profundizar en distintos aspectos de la consulta, con un alcance mayor que las sesiones de 15 y 30 minutos.",
      category: CATEGORY_LECTURAS,
      sortOrder: 3,
    },
    create: {
      slug: "consulta-60-minutos",
      name: "Lectura de Tarot — 1 hora",
      description:
        "Lectura de tarot personalizada mediante llamada, en la modalidad de mayor duración y profundidad. Permite desarrollar ampliamente diferentes situaciones, realizar varias preguntas y profundizar en distintos aspectos de la consulta, con un alcance mayor que las sesiones de 15 y 30 minutos.",
      durationMinutes: 60,
      price: 35,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: CATEGORY_LECTURAS,
      sortOrder: 3,
    },
  });

  // --- 2. Rituales Energéticos ---
  const rituales = [
    {
      slug: "ritual-endulzamiento",
      name: "Ritual de Endulzamiento",
      price: 120,
      description:
        "Trabajo energético orientado a la armonización de relaciones de pareja y vínculos afectivos. Busca favorecer la armonía, el acercamiento, la comunicación y una energía afectiva más favorable dentro de la relación.",
    },
    {
      slug: "ritual-abre-caminos",
      name: "Ritual Abre Caminos",
      price: 120,
      description:
        "Trabajo energético enfocado en la apertura de caminos y oportunidades, especialmente en áreas como negocios, trabajo, proyectos y nuevas oportunidades. Está orientado a situaciones percibidas como bloqueadas o estancadas.",
    },
    {
      slug: "ritual-destrancadera",
      name: "Ritual Destrancadera",
      price: 120,
      description:
        "Trabajo energético de limpieza, enfocado en el alejamiento de influencias negativas, la renovación energética y las situaciones de estancamiento. A diferencia del Ritual Abre Caminos, está orientado principalmente a limpiar y destrabar, antes que a trabajar sobre oportunidades específicas.",
    },
    {
      slug: "ritual-proteccion",
      name: "Ritual de Protección",
      price: 100,
      description:
        "Trabajo energético enfocado en la protección y el resguardo frente a influencias externas, ambientes cargados o situaciones que puedan generar desgaste energético. Su enfoque es preventivo y de acompañamiento, sin prometer resultados absolutos.",
    },
    {
      slug: "ritual-corte-de-lazos",
      name: "Ritual de Corte de Lazos",
      price: 140,
      description:
        "Ritual de distanciamiento y cierre de vínculos, orientado al alejamiento de una persona o relación que genera daño, desgaste o influencia negativa. Trabaja simbólicamente para separar y liberar a la persona de una conexión que desea dejar atrás.",
    },
    {
      slug: "ritual-del-dinero",
      name: "Ritual del Dinero",
      price: 100,
      description:
        "Trabajo energético enfocado específicamente en objetivos relacionados con dinero, abundancia y prosperidad. Puede aplicarse a requerimientos concretos vinculados a negocios, proyectos, metas económicas, oportunidades financieras u objetivos específicos de abundancia — a diferencia del Ritual Abre Caminos, su enfoque es exclusivamente económico.",
    },
    {
      slug: "ritual-de-amarre",
      name: "Ritual de Amarre",
      price: 150,
      description:
        "Ritual de enfoque afectivo relacionado con una persona o vínculo sentimental específico. Comparte una orientación similar al Ritual de Endulzamiento, pero representa un trabajo energético de mayor intensidad y profundidad. No presenta resultados como garantizados.",
    },
  ];

  for (const [i, ritual] of rituales.entries()) {
    await prisma.service.upsert({
      where: { slug: ritual.slug },
      update: {
        name: ritual.name,
        description: ritual.description,
        price: ritual.price,
        currency: "USD",
        category: CATEGORY_RITUALES,
        sortOrder: i,
      },
      create: {
        slug: ritual.slug,
        name: ritual.name,
        description: ritual.description,
        durationMinutes: 30,
        price: ritual.price,
        currency: "USD",
        available: false,
        modality: "VIDEOLLAMADA",
        category: CATEGORY_RITUALES,
        sortOrder: i,
      },
    });
  }

  // --- 3. Otros (sin precio definitivo todavía) ---
  const otros = [
    {
      slug: "informe-numerologico",
      name: "Informe Numerológico",
      description:
        "Análisis personalizado basado en los datos de nacimiento, mediante el cual se estudian distintos aspectos numerológicos: características personales, ciclos y tendencias.",
    },
    {
      slug: "tabacos",
      name: "Tabacos",
      description:
        "Lectura espiritual realizada mediante tabacos, utilizada como herramienta de interpretación y orientación sobre distintas situaciones y aspectos de la vida de la persona.",
    },
    {
      slug: "carta-astral",
      name: "Carta Astral",
      description:
        "Interpretación personalizada de la carta astral a partir de los datos de nacimiento. Permite analizar distintos aspectos de la personalidad, tendencias, ciclos y áreas de la vida según la posición de los astros en el momento del nacimiento.",
    },
  ];

  for (const [i, item] of otros.entries()) {
    await prisma.service.upsert({
      where: { slug: item.slug },
      update: { name: item.name, description: item.description, category: CATEGORY_OTROS, sortOrder: i },
      create: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        durationMinutes: 30,
        price: 0,
        currency: "USD",
        available: false,
        modality: "VIDEOLLAMADA",
        category: CATEGORY_OTROS,
        sortOrder: i,
      },
    });
  }

  const testimonials = [
    {
      name: "María C.",
      text: "Sentí una consulta honesta, sin miedo y sin vueltas. Beto me ayudó a ver una decisión de trabajo con mucha más claridad.",
      rating: 5,
    },
    {
      name: "Andrés R.",
      text: "Me gustó que no fue un show, fue una conversación real. Las cartas abrieron preguntas que yo ya traía pero no sabía nombrarlas.",
      rating: 5,
    },
    {
      name: "Paula G.",
      text: "Cercano y directo. Justo lo que necesitaba para tomar una decisión que llevaba meses posponiendo.",
      rating: 5,
    },
  ];

  for (const t of testimonials) {
    const existing = await prisma.testimonial.findFirst({ where: { name: t.name, text: t.text } });
    if (!existing) {
      await prisma.testimonial.create({ data: { ...t, status: "PUBLISHED" } });
    }
  }

  await prisma.setting.upsert({
    where: { key: "brand_name" },
    update: {},
    create: { key: "brand_name", value: JSON.stringify("Universo de Beto") },
  });
  await prisma.setting.upsert({
    where: { key: "site_name" },
    update: {},
    create: { key: "site_name", value: JSON.stringify("Tarot de Beto") },
  });
  await prisma.setting.upsert({
    where: { key: "booking_buffer_minutes" },
    update: {},
    create: { key: "booking_buffer_minutes", value: JSON.stringify(10) },
  });
  await prisma.setting.upsert({
    where: { key: "booking_payment_window_minutes" },
    update: {},
    create: { key: "booking_payment_window_minutes", value: JSON.stringify(15) },
  });
  await prisma.setting.upsert({
    where: { key: "faq_items" },
    update: {},
    create: { key: "faq_items", value: JSON.stringify(faqItems) },
  });
  await prisma.setting.upsert({
    where: { key: "reminder_hours_before" },
    update: {},
    create: { key: "reminder_hours_before", value: JSON.stringify([24, 2]) },
  });

  // Horario de atención: todos los días 11:00–23:00 (hora de Colombia), tal
  // como pide el prompt original. Editable por el admin en la Fase 7; por
  // ahora se define acá, nunca hardcodeado en el motor de disponibilidad.
  const WORKDAY_START_MINUTE = 11 * 60;
  const WORKDAY_END_MINUTE = 23 * 60;
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    const existing = await prisma.availability.findFirst({ where: { dayOfWeek } });
    if (!existing) {
      await prisma.availability.create({
        data: { dayOfWeek, startMinute: WORKDAY_START_MINUTE, endMinute: WORKDAY_END_MINUTE },
      });
    }
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: "admin@tarotdebeto.local" },
    update: {},
    create: {
      firstName: "Admin",
      lastName: "Prueba",
      email: "admin@tarotdebeto.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "cliente@tarotdebeto.local" },
    update: {},
    create: {
      firstName: "Cliente",
      lastName: "Prueba",
      email: "cliente@tarotdebeto.local",
      phone: "+57 300 000 0000",
      country: "Colombia",
      passwordHash,
      role: "CLIENT",
    },
  });

  const serviceCount = await prisma.service.count();
  console.log(
    `Seed completo: ${serviceCount} servicios (catálogo: Lecturas de Tarot, Rituales Energéticos, Otros), 3 testimonios publicados, 3 settings, horario semanal (7 días), 2 usuarios de prueba.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
