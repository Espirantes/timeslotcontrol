"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const TOKEN_TTL_HOURS = 2;

function baseUrl() {
  return process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

async function sendResetEmail(to: string, name: string, token: string, locale: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@timeslotcontrol.com";

  if (!apiKey) {
    console.warn("[password-reset] RESEND_API_KEY not set — skipping email");
    return;
  }

  const resetUrl = `${baseUrl()}/${locale}/reset-password/${token}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to,
      subject: "Obnova hesla – TimeslotControl",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
          <h2 style="color:#c0392b">Obnova hesla</h2>
          <p>Dobrý den, ${name},</p>
          <p>Obdrželi jsme žádost o obnovu hesla k vašemu účtu v TimeslotControl.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}"
               style="background:#c0392b;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600">
              Nastavit nové heslo
            </a>
          </p>
          <p style="font-size:13px;color:#64748b">
            Odkaz je platný ${TOKEN_TTL_HOURS} hodiny. Pokud jste o obnovu hesla nežádali, ignorujte tento e-mail.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:12px;color:#94a3b8">TimeslotControl · automatická zpráva</p>
        </div>
      `,
    }),
  });
}

// ─── Request reset ────────────────────────────────────────────────────────────

export async function requestPasswordReset(
  email: string,
  locale: string = "cs"
): Promise<{ ok: boolean }> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // Always return ok=true to avoid email enumeration
  if (!user || !user.isActive) return { ok: true };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
  });

  await sendResetEmail(user.email, user.name, token, locale);

  return { ok: true };
}

// ─── Validate token ───────────────────────────────────────────────────────────

export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
    select: { email: true, passwordResetExpiresAt: true, isActive: true },
  });

  if (!user || !user.isActive || !user.passwordResetExpiresAt) return { valid: false };
  if (user.passwordResetExpiresAt < new Date()) return { valid: false };

  return { valid: true, email: user.email };
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (newPassword.length < 8) return { ok: false, error: "Heslo musí mít alespoň 8 znaků" };

  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
    select: { id: true, passwordResetExpiresAt: true, isActive: true },
  });

  if (!user || !user.isActive) return { ok: false, error: "Neplatný odkaz" };
  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    return { ok: false, error: "Platnost odkazu vypršela. Vyžádejte si nový." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, 12),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return { ok: true };
}
