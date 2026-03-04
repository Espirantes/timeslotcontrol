import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@dockscheduling.com" },
    update: {},
    create: {
      email: "admin@dockscheduling.com",
      name: "Administrator",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✓ Admin user:", admin.email);

  // Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { id: "warehouse-01" },
    update: {},
    create: {
      id: "warehouse-01",
      name: "Sklad Praha",
      address: "Průmyslová 1, 150 00 Praha",
      timezone: "Europe/Prague",
    },
  });
  console.log("✓ Warehouse:", warehouse.name);

  // Warehouse worker
  const workerPassword = await bcrypt.hash("worker123", 12);
  const worker = await prisma.user.upsert({
    where: { email: "worker@dockscheduling.com" },
    update: {},
    create: {
      email: "worker@dockscheduling.com",
      name: "Pracovník Skladu",
      password: workerPassword,
      role: "WAREHOUSE_WORKER",
      warehouses: { create: { warehouseId: warehouse.id } },
    },
  });
  console.log("✓ Worker:", worker.email);

  // Gate 1 with opening hours
  const gate1 = await prisma.gates.upsert({
    where: { id: "gate-01" },
    update: {},
    create: {
      id: "gate-01",
      warehouseId: warehouse.id,
      name: "Rampa 1",
      description: "Hlavní vykládková rampa",
    },
  });

  // Gate 2
  const gate2 = await prisma.gates.upsert({
    where: { id: "gate-02" },
    update: {},
    create: {
      id: "gate-02",
      warehouseId: warehouse.id,
      name: "Rampa 2",
      description: "Vedlejší rampa",
    },
  });
  console.log("✓ Gates:", gate1.name, gate2.name);

  // Opening hours for both gates (Mon–Fri 6:00–18:00, Sat 7:00–13:00, Sun closed)
  const defaultHours = [
    { dayOfWeek: 0, isOpen: false, openTime: "06:00", closeTime: "18:00" }, // Sun
    { dayOfWeek: 1, isOpen: true, openTime: "06:00", closeTime: "18:00" },  // Mon
    { dayOfWeek: 2, isOpen: true, openTime: "06:00", closeTime: "18:00" },  // Tue
    { dayOfWeek: 3, isOpen: true, openTime: "06:00", closeTime: "18:00" },  // Wed
    { dayOfWeek: 4, isOpen: true, openTime: "06:00", closeTime: "18:00" },  // Thu
    { dayOfWeek: 5, isOpen: true, openTime: "06:00", closeTime: "18:00" },  // Fri
    { dayOfWeek: 6, isOpen: true, openTime: "07:00", closeTime: "13:00" },  // Sat
  ];

  for (const gate of [gate1, gate2]) {
    for (const hours of defaultHours) {
      await prisma.gateOpeningHours.upsert({
        where: { gateId_dayOfWeek: { gateId: gate.id, dayOfWeek: hours.dayOfWeek } },
        update: {},
        create: { gateId: gate.id, ...hours },
      });
    }
  }
  console.log("✓ Opening hours set for both gates");

  // Transport units
  const transportUnits = [
    { id: "tu-eur",       name: "EUR paleta",           weightKg: 20,  processingMinutes: 4, sortOrder: 1 },
    { id: "tu-oneway",    name: "Jednorázová paleta",   weightKg: 15,  processingMinutes: 4, sortOrder: 2 },
    { id: "tu-other-pal", name: "Jiná paleta",          weightKg: 15,  processingMinutes: 4, sortOrder: 3 },
    { id: "tu-carton",    name: "Karton",               weightKg: 1,   processingMinutes: 1, sortOrder: 4 },
    { id: "tu-other",     name: "Jiné",                 weightKg: 0,   processingMinutes: 2, sortOrder: 5 },
  ];
  for (const tu of transportUnits) {
    await prisma.transportUnit.upsert({
      where: { id: tu.id },
      update: {},
      create: tu,
    });
  }
  console.log("✓ Transport units seeded");

  // Client: Allegro
  const clientAllegro = await prisma.client.upsert({
    where: { id: "client-allegro" },
    update: {},
    create: {
      id: "client-allegro",
      name: "Allegro",
      contactEmail: "warehouse@allegro.cz",
    },
  });
  console.log("✓ Client:", clientAllegro.name);

  // Client user
  const clientPassword = await bcrypt.hash("client123", 12);
  await prisma.user.upsert({
    where: { email: "allegro@dockscheduling.com" },
    update: {},
    create: {
      email: "allegro@dockscheduling.com",
      name: "Allegro Manager",
      password: clientPassword,
      role: "CLIENT",
      clientId: clientAllegro.id,
    },
  });

  // Supplier: Procter & Gamble
  const supplierPG = await prisma.supplier.upsert({
    where: { id: "supplier-pg" },
    update: {},
    create: {
      id: "supplier-pg",
      name: "Procter & Gamble",
      contactEmail: "logistics@pg.com",
    },
  });

  await prisma.clientSupplier.upsert({
    where: { clientId_supplierId: { clientId: clientAllegro.id, supplierId: supplierPG.id } },
    update: {},
    create: { clientId: clientAllegro.id, supplierId: supplierPG.id },
  });

  // Supplier user
  const supplierPassword = await bcrypt.hash("supplier123", 12);
  await prisma.user.upsert({
    where: { email: "pg@dockscheduling.com" },
    update: {},
    create: {
      email: "pg@dockscheduling.com",
      name: "P&G Logistics",
      password: supplierPassword,
      role: "SUPPLIER",
      supplierId: supplierPG.id,
    },
  });
  console.log("✓ Supplier:", supplierPG.name, "→ linked to", clientAllegro.name);

  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:    admin@dockscheduling.com  / admin123");
  console.log("  Worker:   worker@dockscheduling.com / worker123");
  console.log("  Client:   allegro@dockscheduling.com / client123");
  console.log("  Supplier: pg@dockscheduling.com     / supplier123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
