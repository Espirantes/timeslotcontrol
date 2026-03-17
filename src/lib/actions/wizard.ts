"use server";

import { prisma } from "@/lib/prisma";
import { cachedAuth as auth } from "@/auth";

export type WizardDemoIds = {
  warehouseId: string;
  gateId: string;
  clientId: string;
  supplierId: string;
};

export async function createWizardDemoData(): Promise<WizardDemoIds> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.create({
      data: { name: "Demo Sklad (Průvodce)" },
    });

    const gate = await tx.gates.create({
      data: { warehouseId: warehouse.id, name: "Demo Rampa (Průvodce)" },
    });

    const client = await tx.client.create({
      data: { name: "Demo Klient (Průvodce)" },
    });

    const supplier = await tx.supplier.create({
      data: { name: "Demo Dodavatel (Průvodce)" },
    });

    await tx.clientSupplier.create({
      data: { clientId: client.id, supplierId: supplier.id },
    });

    return {
      warehouseId: warehouse.id,
      gateId: gate.id,
      clientId: client.id,
      supplierId: supplier.id,
    };
  });
}

export async function cleanupWizardDemoData(ids: WizardDemoIds): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  // Cancel/delete any reservations tied to this demo gate or client first
  await prisma.reservation.deleteMany({
    where: {
      OR: [{ gateId: ids.gateId }, { clientId: ids.clientId }],
    },
  });

  // Warehouse cascade-deletes gates
  await prisma.warehouse.delete({ where: { id: ids.warehouseId } }).catch(() => {});
  // Client cascade-deletes clientSupplier rows
  await prisma.client.delete({ where: { id: ids.clientId } }).catch(() => {});
  await prisma.supplier.delete({ where: { id: ids.supplierId } }).catch(() => {});
}
