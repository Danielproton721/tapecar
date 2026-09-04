export const dynamic = "force-dynamic";

async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * POST /api/admin/login — recebe { senha }, compara com ADMIN_PASSWORD e, se
 * bater, seta o cookie de sessão (admin_ok). Só a senha; não há usuário.
 */
export async function POST(req) {
  const pass = process.env.ADMIN_PASSWORD || "";
  if (!pass) {
    return Response.json({ error: "Painel não configurado." }, { status: 503 });
  }

  const { senha } = await req.json().catch(() => ({}));
  if (!senha || senha !== pass) {
    return Response.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = await sha256hex(pass);
  const res = Response.json({ ok: true });
  // 7 dias; HttpOnly (JS não lê) + SameSite=Lax (anti-CSRF).
  res.headers.append(
    "Set-Cookie",
    `admin_ok=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
  return res;
}
