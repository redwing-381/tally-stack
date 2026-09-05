import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, PERSONA_COOKIE } from "@/lib/odoo/session";

/**
 * Gates every page except /login on cookie presence, and keeps the portal
 * persona confined to /portal. This is a UX/nav convenience, not the
 * security boundary — real authorization is Odoo's own ACLs and record
 * rules on every proxied call_kw in lib/odoo/client.ts. A forged or stale
 * cookie can change what renders, never what data can actually be read or
 * written: a portal session can only ever fetch its own partner's records,
 * no matter which route hits it.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const persona = request.cookies.get(PERSONA_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname !== "/login") {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    const home = persona === "portal" ? "/portal/invoices" : "/dashboard";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (hasSession && persona === "portal" && !pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/portal/invoices", request.url));
  }

  if (hasSession && persona !== "portal" && pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
