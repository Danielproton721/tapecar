import { getBeehiveTransaction } from "@/lib/beehive";

export const dynamic = "force-dynamic";

/**
 * GET /api/payment/status?id=TRANSACTION_ID — usado pela tela do Pix (pix.js) pra
 * saber se o cliente já pagou. Consulta a Beehive com a secret key (server-side)
 * e devolve o status atual da transação. Sem isso, o Pix nunca confirma na tela.
 */
export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "sem id", status: "unknown" }, { status: 400 });

  const { ok, data: tx } = await getBeehiveTransaction(id);
  if (!ok || !tx || typeof tx !== "object") {
    return Response.json({ status: "unknown" });
  }

  return Response.json({ status: String(tx.status || "").toLowerCase() });
}
