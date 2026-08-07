import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.service.updateMany({
    where: { name: "Clase de Pilates Reformer" },
    data: { name: "Fisioterapia" },
  });
  console.log("Updated:", result.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
