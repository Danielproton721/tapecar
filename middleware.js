import { NextResponse } from "next/server";

/**
 * Protege o painel admin (/admin e /api/admin/*) com senha.
 * Só a senha importa: ADMIN_PASSWORD nas env vars da Vercel. O navegador pede
 * "usuário e senha" (Basic Auth) — deixe o usuário em branco e digite a senha.
 * Sem ADMIN_PASSWORD definida, o painel fica BLOQUEADO (nega tudo).
 */
export function middleware(req) {
  const pass = process.env.ADMIN_PASSWORD || "";

  // Sem senha definida => painel trancado (fail-closed).
  if (!pass) {
    return new NextResponse(
      "Painel admin não configurado. Defina ADMIN_PASSWORD nas variáveis de ambiente.",
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
    // aceita qualquer usuário; valida SÓ a senha (parte depois do ":")
    const i = decoded.indexOf(":");
    const p = i >= 0 ? decoded.slice(i + 1) : decoded;
    if (p === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Senha necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RodaLux Admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
