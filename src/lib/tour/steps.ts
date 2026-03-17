import type { UserRole } from "@/generated/prisma/client";

export type GlobalStep = {
  /** Required page path (e.g. "/warehouses"). null = works on any page. */
  page: string | null;
  /** CSS selector of the element to highlight. Omit for welcome/done cards. */
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "bottom" | "left" | "right" | "over";
    align?: "start" | "center" | "end";
  };
};

export type RoleTourSteps = Record<string, GlobalStep[]>;

/**
 * Build tour steps for all roles.
 * Called inside TourManager with translated strings.
 */
export function buildTourSteps(
  role: UserRole,
  t: (key: string) => string
): GlobalStep[] {
  switch (role) {
    case "ADMIN":
      return [
        { page: null, popover: { title: t("admin.s0.title"), description: t("admin.s0.body"), side: "over" } },
        { page: "/warehouses", element: "[data-tour='nav-warehouses']", popover: { title: t("admin.s1.title"), description: t("admin.s1.body"), side: "right" } },
        { page: "/warehouses", element: "[data-tour='warehouses-create']", popover: { title: t("admin.s2.title"), description: t("admin.s2.body"), side: "bottom" } },
        { page: "/gates", element: "[data-tour='nav-gates']", popover: { title: t("admin.s3.title"), description: t("admin.s3.body"), side: "right" } },
        { page: "/gates", element: "[data-tour='gates-create']", popover: { title: t("admin.s4.title"), description: t("admin.s4.body"), side: "bottom" } },
        { page: "/clients", element: "[data-tour='nav-clients']", popover: { title: t("admin.s5.title"), description: t("admin.s5.body"), side: "right" } },
        { page: "/suppliers", element: "[data-tour='nav-suppliers']", popover: { title: t("admin.s6.title"), description: t("admin.s6.body"), side: "right" } },
        { page: "/users", element: "[data-tour='nav-users']", popover: { title: t("admin.s7.title"), description: t("admin.s7.body"), side: "right" } },
        { page: "/calendar", element: "[data-tour='calendar-new-reservation']", popover: { title: t("admin.s8.title"), description: t("admin.s8.body"), side: "bottom" } },
        { page: null, popover: { title: t("done.title"), description: t("done.body"), side: "over" } },
      ];
    case "WAREHOUSE_WORKER":
      return [
        { page: null, popover: { title: t("worker.s0.title"), description: t("worker.s0.body"), side: "over" } },
        { page: "/calendar", element: "[data-tour='nav-calendar']", popover: { title: t("worker.s1.title"), description: t("worker.s1.body"), side: "right" } },
        { page: "/calendar", element: "[data-tour='calendar-new-reservation']", popover: { title: t("worker.s2.title"), description: t("worker.s2.body"), side: "bottom" } },
        { page: "/reservations", element: "[data-tour='nav-reservations']", popover: { title: t("worker.s3.title"), description: t("worker.s3.body"), side: "right" } },
        { page: null, popover: { title: t("done.title"), description: t("done.body"), side: "over" } },
      ];
    case "SUPPLIER":
      return [
        { page: null, popover: { title: t("supplier.s0.title"), description: t("supplier.s0.body"), side: "over" } },
        { page: "/calendar", element: "[data-tour='nav-calendar']", popover: { title: t("supplier.s1.title"), description: t("supplier.s1.body"), side: "right" } },
        { page: "/calendar", element: "[data-tour='calendar-new-reservation']", popover: { title: t("supplier.s2.title"), description: t("supplier.s2.body"), side: "bottom" } },
        { page: "/reservations", element: "[data-tour='nav-reservations']", popover: { title: t("supplier.s3.title"), description: t("supplier.s3.body"), side: "right" } },
        { page: null, popover: { title: t("done.title"), description: t("done.body"), side: "over" } },
      ];
    case "CLIENT":
      return [
        { page: null, popover: { title: t("client.s0.title"), description: t("client.s0.body"), side: "over" } },
        { page: "/calendar", element: "[data-tour='nav-calendar']", popover: { title: t("client.s1.title"), description: t("client.s1.body"), side: "right" } },
        { page: "/calendar", element: "[data-tour='calendar-new-reservation']", popover: { title: t("client.s2.title"), description: t("client.s2.body"), side: "bottom" } },
        { page: null, popover: { title: t("done.title"), description: t("done.body"), side: "over" } },
      ];
    default:
      return [];
  }
}
