"use server";

import { prisma } from "@/lib/prisma";
import { cachedAuth as auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session.user;
}

function randomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function parseBool(val: string | undefined): boolean {
  return ["true", "ano", "yes", "1"].includes((val ?? "").trim().toLowerCase());
}

/** Split a semicolon-separated list, trim & filter blanks */
function splitList(val: string | undefined): string[] {
  return (val ?? "").split(";").map((s) => s.trim()).filter(Boolean);
}

export type ImportRowError = { row: number; message: string };

export type ImportResult = {
  created: number;
  failed: number;
  errors: ImportRowError[];
};

export type UserImportResult = ImportResult & {
  credentials: { name: string; email: string; password: string; generated: boolean }[];
};

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function bulkImportClients(
  rows: { name: string; contactemail?: string; canmanagesuppliers?: string }[]
): Promise<ImportResult> {
  await requireAdmin();

  let created = 0;
  const errors: ImportRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name?.trim();
    if (!name) {
      errors.push({ row: i + 1, message: "Název nesmí být prázdný" });
      continue;
    }
    try {
      await prisma.client.create({
        data: {
          name,
          contactEmail: row.contactemail?.trim() || null,
          canManageSuppliers: parseBool(row.canmanagesuppliers),
        },
      });
      created++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ row: i + 1, message: msg.includes("Unique") ? `Klient "${name}" již existuje` : msg });
    }
  }

  revalidatePath("/clients");
  return { created, failed: errors.length, errors };
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export async function bulkImportSuppliers(
  rows: { name: string; contactemail?: string; clients?: string }[]
): Promise<ImportResult> {
  await requireAdmin();

  let created = 0;
  const errors: ImportRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name?.trim();
    if (!name) {
      errors.push({ row: i + 1, message: "Název nesmí být prázdný" });
      continue;
    }

    // Resolve client names → IDs
    const clientNames = splitList(row.clients);
    let clientIds: string[] = [];

    if (clientNames.length > 0) {
      const found = await prisma.client.findMany({
        where: { name: { in: clientNames }, deletedAt: null },
        select: { id: true, name: true },
      });
      const notFound = clientNames.filter((n) => !found.find((c) => c.name === n));
      if (notFound.length > 0) {
        errors.push({ row: i + 1, message: `Klienti nenalezeni: ${notFound.join(", ")}` });
        continue;
      }
      clientIds = found.map((c) => c.id);
    }

    try {
      await prisma.supplier.create({
        data: {
          name,
          contactEmail: row.contactemail?.trim() || null,
          clients: clientIds.length
            ? { create: clientIds.map((clientId) => ({ clientId })) }
            : undefined,
        },
      });
      created++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ row: i + 1, message: msg.includes("Unique") ? `Dodavatel "${name}" již existuje` : msg });
    }
  }

  revalidatePath("/suppliers");
  return { created, failed: errors.length, errors };
}

// ─── Users ───────────────────────────────────────────────────────────────────

const VALID_ROLES: UserRole[] = ["ADMIN", "WAREHOUSE_WORKER", "SUPPLIER", "CLIENT"];

export async function bulkImportUsers(
  rows: { name: string; email: string; role: string; client?: string; supplier?: string; password?: string }[]
): Promise<UserImportResult> {
  await requireAdmin();

  let created = 0;
  const errors: ImportRowError[] = [];
  const credentials: UserImportResult["credentials"] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const upperRole = row.role?.trim().toUpperCase() as UserRole;

    if (!name) { errors.push({ row: i + 1, message: "Jméno nesmí být prázdné" }); continue; }
    if (!email || !email.includes("@")) { errors.push({ row: i + 1, message: "Neplatný e-mail" }); continue; }
    if (!VALID_ROLES.includes(upperRole)) {
      errors.push({ row: i + 1, message: `Neplatná role "${row.role}". Povoleno: ${VALID_ROLES.join(", ")}` });
      continue;
    }

    // Resolve client
    let clientId: string | null = null;
    const clientName = row.client?.trim();
    if (clientName) {
      const client = await prisma.client.findFirst({
        where: { name: clientName, deletedAt: null },
        select: { id: true },
      });
      if (!client) {
        errors.push({ row: i + 1, message: `Klient "${clientName}" nenalezen` });
        continue;
      }
      clientId = client.id;
    }

    // Resolve supplier
    let supplierId: string | null = null;
    const supplierName = row.supplier?.trim();
    if (supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: { name: supplierName, deletedAt: null },
        select: { id: true },
      });
      if (!supplier) {
        errors.push({ row: i + 1, message: `Dodavatel "${supplierName}" nenalezen` });
        continue;
      }
      supplierId = supplier.id;
    }

    const rawPassword = row.password?.trim() || "";
    const generated = !rawPassword;
    const password = rawPassword || randomPassword();

    try {
      await prisma.user.create({
        data: {
          name,
          email,
          password: await bcrypt.hash(password, 12),
          role: upperRole,
          clientId,
          supplierId,
          isVerified: true,
          isActive: true,
        },
      });
      created++;
      credentials.push({ name, email, password, generated });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ row: i + 1, message: msg.includes("Unique") ? `E-mail ${email} je již registrován` : msg });
    }
  }

  revalidatePath("/users");
  return { created, failed: errors.length, errors, credentials };
}
