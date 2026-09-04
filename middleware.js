import { NextResponse } from "next/server";

/**
 * Protege o painel admin (/admin e /api/admin/*) com Basic Auth.
 * Credenciais nas env vars da Vercel: ADMIN_USER e ADMIN_PASSWORD.
 * Sem elas configuradas, o painel fica BLOQUEADO (nega tudo) — nunca aberto.
 */
export function middleware(req) {
  const user = process.env.ADMIN_USER || "";
  const pass = process.env.ADMIN_PASSWORD || "";

  // Sem credenciais definidas => painel trancado (fail-closed).
  if (!user || !pass) {
    return new NextResponse(
      "Painel admin não configurado. Defina ADMIN_USER e ADMIN_PASSWORD nas variáveis de ambiente.",
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const i = decoded.indexOf(":");
    const u = i >= 0 ? decoded.slice(0, i) : "";
    const p = i >= 0 ? decoded.slice(i + 1) : "";
    if (u === user && p === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RodaLux Admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
