import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const business = await prisma.business.findUnique({ where: { slug: "deporte" } });
  if (!business) throw new Error("not found");
  console.log("Business:", business.name, "timezone:", business.timezone);

  const services = await prisma.service.findMany({ where: { businessId: business.id } });
  console.log("Services:", services.map(s => ({ id: s.id, name: s.name, durationMin: s.durationMin, active: s.active })));

  const staff = await prisma.staff.findMany({
    where: { businessId: business.id },
    include: { availability: true, staffServices: true },
  });
  console.log("Staff:", JSON.stringify(staff, null, 2));

  console.log("Server TZ:", Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log("Server now:", new Date().toString(), "| UTC:", new Date().toISOString());
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
