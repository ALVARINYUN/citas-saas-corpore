import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const business = await prisma.business.update({
    where: { slug: "mi-negocio" },
    data: { name: "Estudio Pilates Vida" },
  });

  const staff = await prisma.staff.findFirstOrThrow({
    where: { businessId: business.id },
  });

  await prisma.service.updateMany({
    where: { businessId: business.id, name: "Corte de cabello" },
    data: { name: "Clase de Pilates", durationMin: 50 },
  });

  const reformer = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Clase de Pilates Reformer",
      durationMin: 55,
    },
  });

  await prisma.staffService.create({
    data: {
      staffId: staff.id,
      serviceId: reformer.id,
    },
  });

  console.log("Business:", business.name, "slug:", business.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
