export const dynamic = "force-dynamic";

/**
 * TEMPORÁRIO — descobre o formato de auth da Beehive. Faz POST /transactions com
 * corpo VAZIO (inválido de propósito, não cria cobrança) com cada formato de
 * header. O formato CERTO passa da auth e cai em validação (422/400); o errado
 * dá 401. Nunca expõe o valor das chaves. Remover depois.
 */
const BASE = "https://api.conta.paybeehive.com.br/v1";

export async function GET() {
  const sk = process.env.PAYMENT_SECRET_KEY || "";
  const pk = process.env.PAYMENT_PUBLIC_KEY || "";
  if (!sk) return Response.json({ erro: "PAYMENT_SECRET_KEY vazia" });

  const b64 = (s) => Buffer.from(s).toString("base64");

  const combos = [
    ["Bearer base64(sk:x)", { Authorization: `Bearer ${b64(`${sk}:x`)}` }],
    ["Basic base64(sk:x)", { Authorization: `Basic ${b64(`${sk}:x`)}` }],
    ["x-api-key sk", { "x-api-key": sk }],
    ["Basic base64(pk:sk)", { Authorization: `Basic ${b64(`${pk}:${sk}`)}` }],
    ["Bearer base64(pk:sk)", { Authorization: `Bearer ${b64(`${pk}:${sk}`)}` }],
    ["Authorization sk (crua)", { Authorization: sk }],
  ];

  const resultados = [];
  for (const [nome, headers] of combos) {
    try {
      const r = await fetch(`${BASE}/transactions`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: "{}", // inválido de propósito → 422 se a auth passar, sem criar nada
        cache: "no-store",
      });
      const body = await r.json().catch(() => ({}));
      resultados.push({
        combo: nome,
        status: r.status,
        authPassou: r.status !== 401 && r.status !== 404,
        msg: (body?.message || JSON.stringify(body)).slice(0, 90),
      });
    } catch (e) {
      resultados.push({ combo: nome, erro: e.message });
    }
  }

  return Response.json({ resultados });
}
