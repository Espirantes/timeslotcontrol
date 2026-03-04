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
      oldData: { status: "REQUESTED" },
      newData: { status: "CONFIRMED" },
      userId: "user-1",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        entityType: "reservation",
        entityId: "res-1",
        action: "created",
        oldData: { status: "REQUESTED" },
        newData: { status: "CONFIRMED" },
        userId: "user-1",
      },
    });
  });

  it("omits optional fields when not provided", async () => {
    await auditLog({
      entityType: "warehouse",
      entityId: "wh-1",
      action: "deleted",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        entityType: "warehouse",
        entityId: "wh-1",
        action: "deleted",
      },
    });
  });

  it("converts null oldData/newData/userId to undefined", async () => {
    await auditLog({
      entityType: "gate",
      entityId: "gate-1",
      action: "updated",
      oldData: null,
      newData: null,
      userId: null,
    });

    const callData = mockCreate.mock.calls[0][0].data;
    expect(callData.oldData).toBeUndefined();
    expect(callData.newData).toBeUndefined();
    expect(callData.userId).toBeUndefined();
  });

  it("handles all valid action types", async () => {
    const actions = [
      "created", "updated", "deleted", "status_changed",
      "version_approved", "version_rejected", "version_proposed",
      "profile_updated", "password_changed",
    ] as const;

    for (const action of actions) {
      mockCreate.mockClear();
      await auditLog({ entityType: "test", entityId: "t-1", action });
      expect(mockCreate).toHaveBeenCalledOnce();
    }
  });
});
