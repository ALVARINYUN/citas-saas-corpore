import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

async function main() {
  const businessId = "cmsjb1cfz0000x4v9udiwxvl3";
  const email = "yundaalvaro081@gmail.com";
  const password = "alvaro0408";

  const passwordHash = await hashPassword(password);

  const user = await prisma.businessUser.create({
    data: { businessId, email, passwordHash, role: "OWNER" },
  });

  console.log("BusinessUser creado:");
  console.log("  id:", user.id);
  console.log("  email:", user.email);
  console.log("  role:", user.role);
  console.log("  businessId:", user.businessId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
