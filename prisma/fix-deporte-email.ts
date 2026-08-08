import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const business = await prisma.business.findUnique({ where: { slug: "deporte" } });
  if (!business) throw new Error("No se encontro el negocio 'deporte'");

  const user = await prisma.businessUser.findFirst({ where: { businessId: business.id } });
  if (!user) throw new Error("No se encontro BusinessUser para 'deporte'");

  const updated = await prisma.businessUser.update({
    where: { id: user.id },
    data: { email: "dueno+deporte@test.com" },
  });

  console.log("Email actualizado:", updated.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
