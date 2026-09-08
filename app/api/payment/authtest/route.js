export const dynamic = "force-dynamic";

/**
 * TEMPORÁRIO — diagnóstico de autenticação da Beehive. Testa vários formatos de
 * header contra GET /balance (que não cria nada) e reporta qual retorna 200.
 * NUNCA expõe o valor da chave — só os status. Remover depois de descobrir.
 */
const BASE = "https://api.conta.paybeehive.com.br/v1";

export async function GET() {
  const key = process.env.PAYMENT_SECRET_KEY || "";
  if (!key) return Response.json({ erro: "PAYMENT_SECRET_KEY vazia na Vercel" });

  const b64x = Buffer.from(`${key}:x`).toString("base64");
  const b64 = Buffer.from(key).toString("base64");

  const formatos = [
    { nome: "Bearer base64(KEY:x)", headers: { Authorization: `Bearer ${b64x}` } },
    { nome: "Basic base64(KEY:x)", headers: { Authorization: `Basic ${b64x}` } },
    { nome: "Bearer KEY (crua)", headers: { Authorization: `Bearer ${key}` } },
    { nome: "Basic base64(KEY)", headers: { Authorization: `Basic ${b64}` } },
    { nome: "Bearer base64(KEY)", headers: { Authorization: `Bearer ${b64}` } },
    { nome: "x-api-key: KEY", headers: { "x-api-key": key } },
    { nome: "x-api-key: base64(KEY:x)", headers: { "x-api-key": b64x } },
  ];

  const resultados = [];
  for (const f of formatos) {
    try {
      const r = await fetch(`${BASE}/balance`, {
        headers: { ...f.headers, "Content-Type": "application/json" },
        cache: "no-store",
      });
      const body = await r.json().catch(() => ({}));
      resultados.push({
        formato: f.nome,
        status: r.status,
        ok: r.ok,
        msg: body?.message || (body?.success ? "OK" : JSON.stringify(body).slice(0, 100)),
      });
    } catch (e) {
      resultados.push({ formato: f.nome, erro: e.message });
    }
  }

  return Response.json({ keyLen: key.length, resultados });
}
