import { getBeehiveTransaction } from "@/lib/beehive";
import { montarPedidoRastroCode, enviarPedidoRastroCode } from "@/lib/rastrocode";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/webhook — postback da Beehive quando uma transação muda de
 * status. Quando confirma PAGO, envia o pedido pra RastroCode (rastreio).
 *
 * Segurança: NÃO confia no corpo do webhook (qualquer um poderia forjar). Pega o
 * id da transação e RE-CONSULTA a Beehive com a secret key pra confirmar que
 * está realmente paga antes de gastar crédito na RastroCode.
 *
 * Configurar na Beehive/Vercel: PAYMENT_WEBHOOK_URL = https://SEU_DOMINIO/api/payment/webhook
 */
const PAGO = new Set(["paid", "authorized"]);

export async function POST(req) {
  const body = await req.json().catch(() => ({}));

  // A Beehive manda { id, type, objectId, data } — só tratamos "transaction".
  if (body?.type && body.type !== "transaction") {
    return Response.json({ ok: true, ignored: body.type });
  }

  const txId = body?.data?.id ?? body?.objectId ?? body?.data?.transaction_id;
  if (!txId) return Response.json({ ok: true, ignored: "sem id" });

  // Confirma o pagamento na fonte.
  const { ok, data: tx } = await getBeehiveTransaction(txId);
  if (!ok || !tx || typeof tx !== "object") {
    return Response.json({ ok: true, verified: false });
  }

  const status = String(tx.status || "").toLowerCase();
  if (!PAGO.has(status)) {
    return Response.json({ ok: true, status }); // ainda não pago — nada a fazer
  }

  const meta = tx.metadata || {};
  const pedido = montarPedidoRastroCode({
    orderId: meta.order_id || String(tx.id),
    customer: {
      name: tx.customer?.name,
      email: tx.customer?.email,
      phone: meta.customer_phone || tx.customer?.phone,
      document: tx.customer?.document?.number || tx.customer?.document,
    },
    address: {
      street: meta.addr_street,
      number: meta.addr_number,
      complement: meta.addr_complement,
      neighborhood: meta.addr_neighborhood,
      city: meta.addr_city,
      state: meta.addr_state,
      zipcode: meta.addr_zip,
    },
    items: tx.items,
  });

  const r = await enviarPedidoRastroCode(pedido);
  return Response.json({
    ok: true,
    rastrocode: r.skipped ? "sem chave configurada" : r.ok ? "enviado" : `erro ${r.status || ""}`,
  });
}
