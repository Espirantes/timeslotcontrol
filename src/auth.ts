import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            warehouses: { select: { warehouseId: true } },
            client: { select: { canManageSuppliers: true } },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          warehouseIds: user.warehouses.map((w) => w.warehouseId),
          clientId: user.clientId,
          supplierId: user.supplierId,
          isVerified: user.isVerified,
          canManageSuppliers: user.client?.canManageSuppliers ?? false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          role: UserRole;
          warehouseIds: string[];
          clientId: string | null;
          supplierId: string | null;
          isVerified: boolean;
          canManageSuppliers: boolean;
        };
        token.role = u.role;
        token.warehouseIds = u.warehouseIds;
        token.clientId = u.clientId;
        token.supplierId = u.supplierId;
        token.isVerified = u.isVerified;
        token.canManageSuppliers = u.canManageSuppliers;
        token.lastRefreshed = Date.now();
      }

      // H3: Refresh claims from DB every 5 minutes to pick up role/scope changes
      const REFRESH_INTERVAL = 5 * 60 * 1000;
      if (!user && token.sub && (Date.now() - ((token.lastRefreshed as number) ?? 0)) > REFRESH_INTERVAL) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            include: {
              warehouses: { select: { warehouseId: true } },
              client: { select: { canManageSuppliers: true } },
            },
          });
          if (!dbUser || !dbUser.isActive) {
            // Force sign-out by returning empty token
            return { ...token, role: undefined };
          }
          token.role = dbUser.role;
          token.warehouseIds = dbUser.warehouses.map((w) => w.warehouseId);
          token.clientId = dbUser.clientId;
          token.supplierId = dbUser.supplierId;
          token.isVerified = dbUser.isVerified;
          token.canManageSuppliers = dbUser.client?.canManageSuppliers ?? false;
          token.lastRefreshed = Date.now();
        } catch {
          // DB unreachable — keep stale claims until next interval
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role as UserRole;
      session.user.warehouseIds = (token.warehouseIds as string[]) ?? [];
      session.user.clientId = (token.clientId as string) ?? null;
      session.user.supplierId = (token.supplierId as string) ?? null;
      session.user.isVerified = (token.isVerified as boolean) ?? true;
      session.user.canManageSuppliers = (token.canManageSuppliers as boolean) ?? false;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});

/** H13: Per-request deduplication of auth() via React.cache() */
export const cachedAuth = cache(auth);
