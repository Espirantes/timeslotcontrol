import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

/** Paths (after stripping the locale segment) that do not require auth */
const PUBLIC_PATHS = ["/login", "/register"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] ?? "cs";
  const pathWithoutLocale = "/" + segments.slice(1).join("/");

  const isPublic =
    pathWithoutLocale === "/" ||
    PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p));

  if (!isPublic) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
