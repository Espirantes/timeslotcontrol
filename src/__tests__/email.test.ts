import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  it("skips sending when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "test@example.com", subject: "Test", html: "<p>Hi</p>" });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("calls Resend API when key is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test123");

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "test@example.com", subject: "Hello", html: "<p>Body</p>" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test123",
        }),
      })
    );
  });

  it("accepts array of recipients", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test123");

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: ["a@test.com", "b@test.com"], subject: "Multi", html: "<p>Hi</p>" });

    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.to).toEqual(["a@test.com", "b@test.com"]);
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

  it("sends email to workers when emails provided", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test123");

    const { notifyReservationCreated } = await import("@/lib/email");

    await notifyReservationCreated({
      reservationId: "res-1",
      gateName: "Rampa 1",
      supplierName: "P&G",
      startTime: "2025-06-01T08:00:00Z",
      workerEmails: ["worker@test.com"],
    });

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.to).toEqual(["worker@test.com"]);
    expect(body.subject).toContain("Rampa 1");
    expect(body.subject).toContain("P&G");
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

  it("sends to both supplier and client when both have email", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test123");
    const { notifyReservationApproved } = await import("@/lib/email");

    await notifyReservationApproved({
      reservationId: "res-1",
      gateName: "Rampa 1",
      startTime: "2025-06-01T08:00:00Z",
      supplierEmail: "supplier@test.com",
      clientEmail: "client@test.com",
    });

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.to).toContain("supplier@test.com");
    expect(body.to).toContain("client@test.com");
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

  it("includes status label in subject", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test123");
    const { notifyStatusChanged } = await import("@/lib/email");

    await notifyStatusChanged({
      reservationId: "res-1",
      gateName: "Rampa 1",
      newStatus: "CLOSED",
      supplierEmail: "s@test.com",
      clientEmail: null,
    });

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.subject).toContain("Uzavřeno");
  });
});
