import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  it("skips sending when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    // Re-import to pick up env
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "test@example.com", subject: "Test", html: "<p>Hi</p>" });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("notifyReservationCreated", () => {
  it("does not send when workerEmails is empty", async () => {
    const { notifyReservationCreated } = await import("@/lib/email");

    await notifyReservationCreated({
      reservationId: "res-1",
      gateName: "Rampa 1",
      supplierName: "P&G",
      startTime: "2025-06-01T08:00:00Z",
      workerEmails: [],
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("notifyReservationApproved", () => {
  it("does not send when no recipients", async () => {
    const { notifyReservationApproved } = await import("@/lib/email");

    await notifyReservationApproved({
      reservationId: "res-1",
      gateName: "Rampa 1",
      startTime: "2025-06-01T08:00:00Z",
      supplierEmail: null,
      clientEmail: null,
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("notifyReservationRejected", () => {
  it("does not send when no recipients", async () => {
    const { notifyReservationRejected } = await import("@/lib/email");

    await notifyReservationRejected({
      reservationId: "res-1",
      gateName: "Rampa 1",
      supplierEmail: null,
      clientEmail: null,
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("notifyStatusChanged", () => {
  it("does not send when no recipients", async () => {
    const { notifyStatusChanged } = await import("@/lib/email");

    await notifyStatusChanged({
      reservationId: "res-1",
      gateName: "Rampa 1",
      newStatus: "CLOSED",
      supplierEmail: null,
      clientEmail: null,
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
