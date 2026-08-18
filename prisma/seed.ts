import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Contraseña de ambos usuarios de prueba (solo desarrollo). */
const TEST_PASSWORD = "Tarot2026!";

async function main() {
  await prisma.service.upsert({
    where: { slug: "consulta-15-minutos" },
    update: {},
    create: {
      slug: "consulta-15-minutos",
      name: "Consulta express",
      description:
        "Una pregunta puntual, una tirada corta, una respuesta directa. Ideal cuando necesitas claridad rápida sobre algo concreto.",
      durationMinutes: 15,
      price: 10,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: "Express",
      sortOrder: 0,
    },
  });

  await prisma.service.upsert({
    where: { slug: "consulta-30-minutos" },
    update: {},
    create: {
      slug: "consulta-30-minutos",
      name: "Lectura general",
      description:
        "Una mirada completa a tu presente: amor, trabajo y camino de vida. Qué energías están en juego y hacia dónde se inclina el camino.",
      durationMinutes: 30,
      price: 20,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: "General",
      sortOrder: 1,
    },
  });

  await prisma.service.upsert({
    where: { slug: "consulta-60-minutos" },
    update: {},
    create: {
      slug: "consulta-60-minutos",
      name: "Consulta extendida",
      description:
        "Sesión pausada para acompañar procesos más grandes: decisiones importantes, ciclos que cierran o varias preguntas en una sola consulta.",
      durationMinutes: 60,
      price: 35,
      currency: "USD",
      available: true,
      modality: "VIDEOLLAMADA",
      category: "Extendida",
      sortOrder: 2,
    },
  });

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

  console.log(
    "Seed completo: 3 servicios, 3 testimonios publicados, 3 settings, horario semanal (7 días), 2 usuarios de prueba.",
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
