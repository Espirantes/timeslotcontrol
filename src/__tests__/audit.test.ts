import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { auditLog } from "@/lib/audit";

describe("auditLog", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ id: "log-1" });
  });

  it("creates audit log entry with all fields", async () => {
    await auditLog({
      entityType: "reservation",
      entityId: "res-1",
      action: "created",
      oldData: null,
      newData: { status: "REQUESTED" },
      userId: "user-1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        entityType: "reservation",
        entityId: "res-1",
        action: "created",
        newData: { status: "REQUESTED" },
        userId: "user-1",
      },
    });
  });

  it("omits optional fields when null", async () => {
    await auditLog({
      entityType: "warehouse",
      entityId: "wh-1",
      action: "updated",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        entityType: "warehouse",
        entityId: "wh-1",
        action: "updated",
      },
    });
  });
});
