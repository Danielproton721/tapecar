export const dynamic = "force-dynamic";

/**
 * O checkout.js manda POST /api/cart-abandoned quando o cliente preenche dados
 * mas não fecha. Stub: só reconhece. Plugue aqui seu CRM, planilha ou webhook
 * de recuperação se quiser usar esse dado.
 */
export async function POST(req) {
  await req.json().catch(() => ({}));
  return Response.json({ ok: true, stub: true });
}
