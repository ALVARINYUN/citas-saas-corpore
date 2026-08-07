import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const business = await prisma.business.update({
    where: { slug: "mi-negocio" },
    data: { name: "Corpore" },
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
