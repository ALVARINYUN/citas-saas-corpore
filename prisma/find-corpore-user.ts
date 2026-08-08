import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

async function main() {
  const business = await prisma.business.findFirst({
    where: {
      OR: [
        { name: "Corpore" },
        { slug: { contains: "corpore" } },
      ],
    },
  });

  if (!business) {
    console.log("No se encontro ningun Business llamado Corpore.");
    return;
  }

  console.log("Business encontrado:");
  console.log("  id:", business.id);
  console.log("  name:", business.name);
  console.log("  slug:", business.slug);

  const users = await prisma.businessUser.findMany({
    where: { businessId: business.id },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  if (users.length === 0) {
    console.log("No hay ningun BusinessUser para este businessId (probablemente creado por seed, no por /admin/signup).");
    return;
  }

  console.log("Usuarios encontrados:");
  for (const u of users) {
    console.log(`  - ${u.email} (role: ${u.role}, creado: ${u.createdAt.toISOString()})`);
  }

  const tempPassword = "Corpore-" + Math.random().toString(36).slice(2, 8) + "!";
  const passwordHash = await hashPassword(tempPassword);

  for (const u of users) {
    await prisma.businessUser.update({
      where: { id: u.id },
      data: { passwordHash },
    });
  }

  console.log("");
  console.log("Password temporal asignada a TODOS los usuarios de arriba:");
  console.log("  " + tempPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
