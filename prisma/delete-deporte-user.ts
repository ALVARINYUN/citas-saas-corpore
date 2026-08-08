import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const deleted = await prisma.businessUser.delete({
    where: { id: "cmskrzpgu000304k02qlhrlud" },
  });
  console.log("Eliminado:", deleted.email, "del businessId:", deleted.businessId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
