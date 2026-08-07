import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: "mi-negocio" },
    update: {},
    create: {
      name: "Mi Negocio",
      slug: "mi-negocio",
    },
  });

  const staff = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: "Ana",
    },
  });

  await prisma.staffAvailability.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      staffId: staff.id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
    })),
  });

  const service = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Corte de cabello",
      durationMin: 30,
    },
  });

  await prisma.staffService.create({
    data: {
      staffId: staff.id,
      serviceId: service.id,
    },
  });

  console.log("Business slug:", business.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
