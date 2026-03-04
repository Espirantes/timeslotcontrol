import type { UserRole } from "@/generated/prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      warehouseIds: string[];
      clientId: string | null;
      supplierId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    warehouseIds: string[];
    clientId: string | null;
    supplierId: string | null;
  }
}
