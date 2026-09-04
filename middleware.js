import { NextResponse } from "next/server";

/**
 * Protege o painel admin com uma tela de login PRÓPRIA (só senha, sem usuário).
 * Em vez do Basic Auth (que mostra usuário + senha no popup do navegador),
 * usamos um cookie de sessão: /admin/login pede só a senha, /api/admin/login
 * valida e seta o cookie, e este middleware confere o cookie no resto.
 * Sem ADMIN_PASSWORD definida, o painel fica trancado.
 */
async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Login (página e API) são livres — senão não dá pra autenticar.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const pass = process.env.ADMIN_PASSWORD || "";
  if (!pass) {
    return new NextResponse(
      "Painel admin não configurado. Defina ADMIN_PASSWORD nas variáveis de ambiente.",
      { status: 503 }
    );
  }

  const token = req.cookies.get("admin_ok")?.value || "";
  const expected = await sha256hex(pass);
  if (token === expected) return NextResponse.next();

  // Não autenticado: API responde 401; páginas vão pro login.
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
