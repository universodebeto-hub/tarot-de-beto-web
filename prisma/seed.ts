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
 * Los servicios de Rituales Energéticos y Otros quedan registrados
 * (`available: false`, con precio/duración/descripción placeholder) a la
 * espera de que se definan sus datos reales en una fase posterior — no
 * inventar precios ni descripciones para ellos.
 */
const CATEGORY_LECTURAS = "Lecturas de Tarot";
const CATEGORY_RITUALES = "Rituales Energéticos";
const CATEGORY_OTROS = "Otros";

const PENDING_DESCRIPTION = "Detalles de este servicio próximamente.";

async function main() {
  // --- 1. Lecturas de Tarot ---
  await prisma.service.upsert({
    where: { slug: "consulta-pregunta-tarot" },
    update: {
      name: "Consulta / Pregunta de Tarot",
      category: CATEGORY_LECTURAS,
      price: 3,
      currency: "USD",
      sortOrder: 0,
    },
    create: {
      slug: "consulta-pregunta-tarot",
      name: "Consulta / Pregunta de Tarot",
      description: "Una pregunta puntual respondida directo con las cartas, sin vueltas.",
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
      category: CATEGORY_LECTURAS,
      sortOrder: 1,
    },
    create: {
      slug: "consulta-15-minutos",
      name: "Lectura de Tarot — 15 minutos",
      description:
        "Una pregunta puntual, una tirada corta, una respuesta directa. Ideal cuando necesitas claridad rápida sobre algo concreto.",
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
      category: CATEGORY_LECTURAS,
      sortOrder: 2,
    },
    create: {
      slug: "consulta-30-minutos",
      name: "Lectura de Tarot — 30 minutos",
      description:
        "Una mirada completa a tu presente: amor, trabajo y camino de vida. Qué energías están en juego y hacia dónde se inclina el camino.",
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
      category: CATEGORY_LECTURAS,
      sortOrder: 3,
    },
    create: {
      slug: "consulta-60-minutos",
      name: "Lectura de Tarot — 1 hora",
      description:
        "Sesión pausada para acompañar procesos más grandes: decisiones importantes, ciclos que cierran o varias preguntas en una sola consulta.",
      durationMinutes: 60,
      price: 35,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: CATEGORY_LECTURAS,
      sortOrder: 3,
    },
  });

  // --- 2. Rituales Energéticos (sin descripción/precio definitivos todavía) ---
  const rituales = [
    { slug: "ritual-endulzamiento", name: "Ritual de Endulzamiento" },
    { slug: "ritual-abre-caminos", name: "Ritual Abre Caminos" },
    { slug: "ritual-destrancadera", name: "Ritual Destrancadera" },
    { slug: "ritual-proteccion", name: "Ritual de Protección" },
    { slug: "ritual-corte-de-lazos", name: "Ritual de Corte de Lazos" },
    { slug: "ritual-del-dinero", name: "Ritual del Dinero" },
    { slug: "ritual-de-amarre", name: "Ritual de Amarre" },
  ];

  for (const [i, ritual] of rituales.entries()) {
    await prisma.service.upsert({
      where: { slug: ritual.slug },
      update: { name: ritual.name, category: CATEGORY_RITUALES, sortOrder: i },
      create: {
        slug: ritual.slug,
        name: ritual.name,
        description: PENDING_DESCRIPTION,
        durationMinutes: 30,
        price: 0,
        currency: "USD",
        available: false,
        modality: "VIDEOLLAMADA",
        category: CATEGORY_RITUALES,
        sortOrder: i,
      },
    });
  }

  // --- 3. Otros (sin descripción/precio definitivos todavía) ---
  const otros = [
    { slug: "informe-numerologico", name: "Informe Numerológico" },
    { slug: "tabacos", name: "Tabacos" },
    { slug: "carta-astral", name: "Carta Astral" },
  ];

  for (const [i, item] of otros.entries()) {
    await prisma.service.upsert({
      where: { slug: item.slug },
      update: { name: item.name, category: CATEGORY_OTROS, sortOrder: i },
      create: {
        slug: item.slug,
        name: item.name,
        description: PENDING_DESCRIPTION,
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
