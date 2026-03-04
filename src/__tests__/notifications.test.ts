import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindMany = vi.fn();
const mockFindUniqueOrThrow = vi.fn();
const mockCreateMany = vi.fn();
const mockCount = vi.fn();
const mockNotifFindMany = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    notification: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockNotifFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

const validSession = {
  user: { id: "user-1", email: "test@test.com", role: "ADMIN", warehouseIds: [], clientId: null, supplierId: null },
};

describe("createNotificationsForEvent", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockCreateMany.mockReset();
  });

  it("creates notifications for admin/worker on RESERVATION_CREATED", async () => {
    mockFindMany.mockResolvedValue([{ id: "admin-1" }, { id: "worker-1" }]);
    mockCreateMany.mockResolvedValue({ count: 2 });

    const { createNotificationsForEvent } = await import("@/lib/actions/notifications");
    await createNotificationsForEvent({
      type: "RESERVATION_CREATED",
      reservationId: "res-1",
      title: "Rampa 1",
      message: "Test message",
      warehouseId: "wh-1",
      clientId: "client-1",
      supplierId: "supplier-1",
    });

    expect(mockCreateMany).toHaveBeenCalledOnce();
    const data = mockCreateMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0].type).toBe("RESERVATION_CREATED");
    expect(data[0].reservationId).toBe("res-1");
  });

  it("skips createMany when no recipients", async () => {
    mockFindMany.mockResolvedValue([]);

    const { createNotificationsForEvent } = await import("@/lib/actions/notifications");
    await createNotificationsForEvent({
      type: "RESERVATION_CREATED",
      reservationId: "res-1",
      title: "Test",
      message: "",
      warehouseId: "wh-1",
      clientId: "c-1",
      supplierId: "s-1",
    });

    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("queries client/supplier users on RESERVATION_APPROVED", async () => {
    mockFindMany.mockResolvedValue([{ id: "client-user-1" }]);
    mockCreateMany.mockResolvedValue({ count: 1 });

    const { createNotificationsForEvent } = await import("@/lib/actions/notifications");
    await createNotificationsForEvent({
      type: "RESERVATION_APPROVED",
      reservationId: "res-1",
      title: "Rampa 1",
      message: "Approved",
      warehouseId: "wh-1",
      clientId: "client-1",
      supplierId: "supplier-1",
    });

    const queryArg = mockFindMany.mock.calls[0][0];
    expect(queryArg.where.OR).toEqual([{ clientId: "client-1" }, { supplierId: "supplier-1" }]);
  });
});

describe("getUnreadCount", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUniqueOrThrow.mockReset();
    mockCount.mockReset();
  });

  it("returns count of unread notifications for current user", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockFindUniqueOrThrow.mockResolvedValue({ id: "user-1" });
    mockCount.mockResolvedValue(5);

    const { getUnreadCount } = await import("@/lib/actions/notifications");
    const count = await getUnreadCount();

    expect(count).toBe(5);
    expect(mockCount).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
    });
  });

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { getUnreadCount } = await import("@/lib/actions/notifications");
    await expect(getUnreadCount()).rejects.toThrow("Unauthorized");
  });
});

describe("getNotifications", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUniqueOrThrow.mockReset();
    mockNotifFindMany.mockReset();
  });

  it("returns notifications mapped to NotificationItem", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockFindUniqueOrThrow.mockResolvedValue({ id: "user-1" });
    mockNotifFindMany.mockResolvedValue([
      {
        id: "n-1",
        type: "RESERVATION_CREATED",
        reservationId: "res-1",
        title: "Test",
        message: "Msg",
        isRead: false,
        createdAt: new Date("2025-06-01T10:00:00Z"),
      },
    ]);

    const { getNotifications } = await import("@/lib/actions/notifications");
    const result = await getNotifications();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("n-1");
    expect(result[0].createdAt).toBe("2025-06-01T10:00:00.000Z");
  });
});

describe("markAsRead", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUniqueOrThrow.mockReset();
    mockUpdateMany.mockReset();
  });

  it("marks notification as read for current user", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockFindUniqueOrThrow.mockResolvedValue({ id: "user-1" });
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const { markAsRead } = await import("@/lib/actions/notifications");
    const result = await markAsRead("n-1");

    expect(result).toEqual({ success: true });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "n-1", userId: "user-1" },
      data: { isRead: true },
    });
  });
});

describe("markAllAsRead", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUniqueOrThrow.mockReset();
    mockUpdateMany.mockReset();
  });

  it("marks all unread notifications as read", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockFindUniqueOrThrow.mockResolvedValue({ id: "user-1" });
    mockUpdateMany.mockResolvedValue({ count: 3 });

    const { markAllAsRead } = await import("@/lib/actions/notifications");
    const result = await markAllAsRead();

    expect(result).toEqual({ success: true });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
      data: { isRead: true },
    });
  });
});
