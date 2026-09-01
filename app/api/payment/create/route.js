export const dynamic = "force-dynamic";

/**
 * O checkout.js faz POST /api/payment/create pra gerar PIX ou cobrar cartão.
 *
 * STUB de demonstração: valida o básico e responde 501. Para ligar de verdade,
 * troque o corpo pela chamada ao seu gateway (Beehive/Payout) usando a SUA
 * secret key — sempre aqui no servidor, NUNCA no cliente.
 *
 * ⚠️ REGRA DE OURO (é o furo do site original): REFAÇA a conta pelo seu catálogo
 * antes de cobrar. Nunca confie no amount_cents que veio do cliente — senão dá
 * pra fechar um pedido de R$150 pagando R$1. Igual você já fez no checkout-total
 * do delivery: recalcula no servidor e recusa divergência com 409.
 */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));

  if (!Number.isInteger(body.amount_cents) || body.amount_cents <= 0) {
    return Response.json(
      { error: "amount_cents must be a positive integer", status: 400 },
      { status: 400 }
    );
  }

  return Response.json(
    {
      error:
        "Checkout em modo demonstração: nenhum pagamento é processado. " +
        "Implemente a chamada ao gateway em app/api/payment/create/route.js.",
      status: 501,
    },
    { status: 501 }
  );
}
