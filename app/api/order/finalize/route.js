import { getBeehiveTransaction } from "@/lib/beehive";
import { montarPedidoRastroCode, enviarPedidoRastroCode } from "@/lib/rastrocode";

export const dynamic = "force-dynamic";

/**
 * POST /api/order/finalize — chamado pela página de obrigado com o transactionId.
 * Confirma o pagamento NA FONTE (Beehive, com a secret key — não confia no
 * cliente), e só então envia o pedido pra RastroCode e devolve o tracking_code
 * pra exibir. Cobre cartão e PIX no mesmo caminho.
 *
 * Retorna:
 *   { pago:false, status } → ainda não confirmado (PIX não pago, ou sem chave)
 *   { pago:true, tracking_code } → confirmado; code pode ser null se a RastroCode
 *     não estiver configurada ou não devolver (aí a UI mostra "código em breve")
 */
const PAGO = new Set(["paid", "authorized"]);

export async function POST(req) {
  const { transactionId } = await req.json().catch(() => ({}));
  if (!transactionId) return Response.json({ pago: false, motivo: "sem_id" });

  const { ok, data: tx } = await getBeehiveTransaction(transactionId);
  if (!ok || !tx || typeof tx !== "object") {
    return Response.json({ pago: false, motivo: "nao_verificado" });
  }

  const status = String(tx.status || "").toLowerCase();
  if (!PAGO.has(status)) return Response.json({ pago: false, status });

  const meta = tx.metadata || {};
  const r = await enviarPedidoRastroCode(
    montarPedidoRastroCode({
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
    })
  );

  const tracking = r?.data?.data?.tracking_code || null;
  return Response.json({ pago: true, tracking_code: tracking });
}
