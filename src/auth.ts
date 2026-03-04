import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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
          include: { warehouses: { select: { warehouseId: true } } },
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
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          role: UserRole;
          warehouseIds: string[];
          clientId: string | null;
          supplierId: string | null;
        };
        token.role = u.role;
        token.warehouseIds = u.warehouseIds;
        token.clientId = u.clientId;
        token.supplierId = u.supplierId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role as UserRole;
      session.user.warehouseIds = (token.warehouseIds as string[]) ?? [];
      session.user.clientId = (token.clientId as string) ?? null;
      session.user.supplierId = (token.supplierId as string) ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
