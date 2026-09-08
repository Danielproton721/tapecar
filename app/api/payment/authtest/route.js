export const dynamic = "force-dynamic";

/**
 * TEMPORÁRIO — diagnóstico de autenticação da Beehive. Testa combinações de
 * header contra GET /balance (não cria nada) e reporta qual retorna 200.
 * NUNCA expõe o valor das chaves — só os status. Remover depois.
 */
const BASE = "https://api.conta.paybeehive.com.br/v1";

export async function GET() {
  const sk = process.env.PAYMENT_SECRET_KEY || "";
  const pk = process.env.PAYMENT_PUBLIC_KEY || "";
  if (!sk) return Response.json({ erro: "PAYMENT_SECRET_KEY vazia na Vercel" });

  const b64 = (s) => Buffer.from(s).toString("base64");

  const combos = [
    ["Bearer base64(sk:x)", { Authorization: `Bearer ${b64(`${sk}:x`)}` }],
    ["Basic base64(sk:x)", { Authorization: `Basic ${b64(`${sk}:x`)}` }],
    ["Bearer base64(sk:)", { Authorization: `Bearer ${b64(`${sk}:`)}` }],
    ["Bearer base64(pk:sk)", { Authorization: `Bearer ${b64(`${pk}:${sk}`)}` }],
    ["Basic base64(pk:sk)", { Authorization: `Basic ${b64(`${pk}:${sk}`)}` }],
    ["Bearer base64(sk:pk)", { Authorization: `Bearer ${b64(`${sk}:${pk}`)}` }],
    ["Basic base64(sk:pk)", { Authorization: `Basic ${b64(`${sk}:${pk}`)}` }],
    ["Bearer sk (crua)", { Authorization: `Bearer ${sk}` }],
    ["Basic base64(:sk)", { Authorization: `Basic ${b64(`:${sk}`)}` }],
    ["x-api-key sk", { "x-api-key": sk }],
    ["api-key sk", { "api-key": sk }],
  ];

  const resultados = [];
  for (const [nome, headers] of combos) {
    try {
      const r = await fetch(`${BASE}/balance`, {
        headers: { ...headers, "Content-Type": "application/json" },
        cache: "no-store",
      });
      const body = await r.json().catch(() => ({}));
      resultados.push({
        combo: nome,
        status: r.status,
        ok: r.ok,
        msg: (body?.message || (body?.success ? "OK ✅" : JSON.stringify(body))).slice(0, 80),
      });
    } catch (e) {
      resultados.push({ combo: nome, erro: e.message });
    }
  }

  return Response.json({ skLen: sk.length, pkLen: pk.length, resultados });
}
