"use server";

import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { notifyNewRegistration } from "@/lib/email";
import { createRegistrationNotification } from "@/lib/actions/notifications";

export async function registerSupplier(data: {
  name: string;
  email: string;
  password: string;
  message?: string;
}) {
  // Validation
  if (!data.name.trim() || !data.email.trim() || !data.password) {
    throw new Error("Missing required fields");
  }
  if (data.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: "SUPPLIER",
      isVerified: false,
      registrationMessage: data.message?.trim() || null,
    },
  });

  await auditLog({
    entityType: "user",
    entityId: user.id,
    action: "registered",
    newData: { email: data.email, role: "SUPPLIER", message: data.message },
  });

  // Notify all admins (in-app + email) — fire and forget
  createRegistrationNotification(user.id, user.name, user.email).catch(console.error);
  notifyNewRegistration({
    userName: user.name,
    userEmail: user.email,
    message: data.message,
  }).catch(console.error);

  return { success: true };
}
