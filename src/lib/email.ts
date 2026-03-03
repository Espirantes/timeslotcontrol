const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@dockscheduling.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const LOGO_URL = "https://www.mailstep.cz/frontend/build/img/logo.svg";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email:", subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email] Failed to send:", res.status, body);
  }
}

// ─── Branded email wrapper ───────────────────────────────────────────────────

function emailLayout(title: string, body: string, ctaUrl?: string, ctaLabel?: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#ecf3fc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ecf3fc;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="background-color:#0c1925;padding:24px 32px;border-radius:12px 12px 0 0;">
          <img src="${LOGO_URL}" alt="Mailstep" height="32" style="display:block;" />
        </td></tr>
        <!-- Red accent bar -->
        <tr><td style="background-color:#db2b19;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Body -->
        <tr><td style="background-color:#ffffff;padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#0c1925;">${title}</h2>
          ${body}
          ${ctaUrl ? `
          <table cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
            <tr><td style="background-color:#db2b19;border-radius:6px;padding:12px 24px;">
              <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;">${ctaLabel ?? "Zobrazit detail"}</a>
            </td></tr>
          </table>
          ` : ""}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#1f3947;padding:16px 32px;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:12px;color:#8ba4b5;">Dock Scheduling System — Mailstep Group</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string) {
  return `<p style="margin:0 0 8px;font-size:14px;color:#2d3e50;"><strong style="color:#0c1925;">${label}:</strong> ${value}</p>`;
}

// ─── Notification templates ──────────────────────────────────────────────────

export async function notifyReservationCreated(params: {
  reservationId: string;
  gateName: string;
  supplierName: string;
  startTime: string;
  workerEmails: string[];
}) {
  const { reservationId, gateName, supplierName, startTime, workerEmails } = params;
  if (workerEmails.length === 0) return;

  const time = new Date(startTime).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" });
  const detailUrl = `${APP_URL}/cs/reservations/${reservationId}`;

  await sendEmail({
    to: workerEmails,
    subject: `Nová rezervace — ${gateName} — ${supplierName}`,
    html: emailLayout(
      "Nová rezervace ke schválení",
      infoRow("Rampa", gateName) + infoRow("Dodavatel", supplierName) + infoRow("Čas", time),
      detailUrl,
      "Schválit / Zamítnout"
    ),
  });
}

export async function notifyReservationApproved(params: {
  reservationId: string;
  gateName: string;
  startTime: string;
  supplierEmail: string | null;
  clientEmail: string | null;
}) {
  const { reservationId, gateName, startTime, supplierEmail, clientEmail } = params;
  const recipients = [supplierEmail, clientEmail].filter(Boolean) as string[];
  if (recipients.length === 0) return;

  const time = new Date(startTime).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" });
  const detailUrl = `${APP_URL}/cs/reservations/${reservationId}`;

  await sendEmail({
    to: recipients,
    subject: `Rezervace schválena — ${gateName}`,
    html: emailLayout(
      "Vaše rezervace byla schválena",
      infoRow("Rampa", gateName) + infoRow("Čas", time),
      detailUrl
    ),
  });
}

export async function notifyReservationRejected(params: {
  reservationId: string;
  gateName: string;
  supplierEmail: string | null;
  clientEmail: string | null;
}) {
  const { reservationId, gateName, supplierEmail, clientEmail } = params;
  const recipients = [supplierEmail, clientEmail].filter(Boolean) as string[];
  if (recipients.length === 0) return;

  const detailUrl = `${APP_URL}/cs/reservations/${reservationId}`;

  await sendEmail({
    to: recipients,
    subject: `Rezervace zamítnuta — ${gateName}`,
    html: emailLayout(
      "Vaše rezervace byla zamítnuta",
      infoRow("Rampa", gateName),
      detailUrl
    ),
  });
}

export async function notifyStatusChanged(params: {
  reservationId: string;
  gateName: string;
  newStatus: string;
  supplierEmail: string | null;
  clientEmail: string | null;
}) {
  const { reservationId, gateName, newStatus, supplierEmail, clientEmail } = params;
  const recipients = [supplierEmail, clientEmail].filter(Boolean) as string[];
  if (recipients.length === 0) return;

  const statusLabels: Record<string, string> = {
    UNLOADING_STARTED: "Vykládka zahájena",
    UNLOADING_COMPLETED: "Vykládka dokončena",
    CLOSED: "Uzavřeno",
    CANCELLED: "Zrušeno",
  };

  const detailUrl = `${APP_URL}/cs/reservations/${reservationId}`;

  await sendEmail({
    to: recipients,
    subject: `Rezervace — ${statusLabels[newStatus] ?? newStatus} — ${gateName}`,
    html: emailLayout(
      "Změna stavu rezervace",
      infoRow("Rampa", gateName) + infoRow("Nový stav", statusLabels[newStatus] ?? newStatus),
      detailUrl
    ),
  });
}
