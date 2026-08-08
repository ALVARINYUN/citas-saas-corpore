import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { verifyPassword } from "../src/lib/password";

async function main() {
  const users = await prisma.businessUser.findMany({
    where: { email: "yundaalvaro081@gmail.com" },
  });
  console.log("Matches for this email:", users.length);
  for (const u of users) {
    console.log("  id:", u.id, "businessId:", u.businessId, "hash:", u.passwordHash);
    const ok = await verifyPassword("alvaro0408", u.passwordHash);
    console.log("  verifyPassword('alvaro0408', hash) =>", ok);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
