export const dynamic = "force-dynamic";

/** POST /api/admin/logout — apaga o cookie de sessão. */
export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", "admin_ok=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return res;
}
