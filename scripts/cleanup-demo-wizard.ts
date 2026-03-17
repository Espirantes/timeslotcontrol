/**
 * One-time cleanup: remove all accumulated demo wizard data
 * Run: npx tsx scripts/cleanup-demo-wizard.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as Parameters<typeof PrismaClient>[0]);

async function main() {
  // 1. Find demo gates and clients first so we can delete linked reservations
  const demoGates = await prisma.gates.findMany({
    where: { name: "Demo Rampa (Průvodce)" },
    select: { id: true },
  });
  const demoClients = await prisma.client.findMany({
    where: { name: "Demo Klient (Průvodce)" },
    select: { id: true },
  });

  const gateIds = demoGates.map((g) => g.id);
  const clientIds = demoClients.map((c) => c.id);

  // 2. Delete reservations tied to demo gates or clients
  const deletedReservations = await prisma.reservation.deleteMany({
    where: {
      OR: [
        ...(gateIds.length ? [{ gateId: { in: gateIds } }] : []),
        ...(clientIds.length ? [{ clientId: { in: clientIds } }] : []),
      ],
    },
  });
  console.log(`Deleted ${deletedReservations.count} demo reservation(s)`);

  // 3. Delete demo warehouses (cascade → gates)
  const deletedWarehouses = await prisma.warehouse.deleteMany({
    where: { name: "Demo Sklad (Průvodce)" },
  });
  console.log(`Deleted ${deletedWarehouses.count} demo warehouse(s)`);

  // 4. Delete demo clients (cascade → clientSupplier)
  const deletedClients = await prisma.client.deleteMany({
    where: { name: "Demo Klient (Průvodce)" },
  });
  console.log(`Deleted ${deletedClients.count} demo client(s)`);

  // 5. Delete demo suppliers
  const deletedSuppliers = await prisma.supplier.deleteMany({
    where: { name: "Demo Dodavatel (Průvodce)" },
  });
  console.log(`Deleted ${deletedSuppliers.count} demo supplier(s)`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
