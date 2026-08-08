import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

const TEST_PASSWORD = "Test1234!";

async function main() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "asc" },
    include: { users: { select: { email: true } } },
  });

  const results: { name: string; slug: string; email: string; status: "created" | "existing" }[] = [];

  for (const b of businesses) {
    if (b.users.length > 0) {
      for (const u of b.users) {
        results.push({ name: b.name, slug: b.slug, email: u.email, status: "existing" });
      }
      continue;
    }

    const email = `dueño+${b.slug}@test.com`;
    const passwordHash = await hashPassword(TEST_PASSWORD);
    await prisma.businessUser.create({
      data: { businessId: b.id, email, passwordHash, role: "OWNER" },
    });
    results.push({ name: b.name, slug: b.slug, email, status: "created" });
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
