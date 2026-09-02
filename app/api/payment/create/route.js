import { createBeehiveTransaction } from "@/lib/beehive";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/create — cria PIX ou cartão na Beehive Pay.
 *
 * O checkout.js (front) manda um formato próprio; a Beehive espera outro. Este
 * route faz a tradução nos dois sentidos:
 *   front  ->  Beehive (TransactionCreateRequest)
 *   Beehive -> front  (pixCode/transactionId/status que o checkout.js lê)
 *
 * As chaves ficam em env vars (vazias por padrão — o Daniel preenche na Vercel):
 *   PAYMENT_SECRET_KEY  chave secreta da Beehive (Basic auth, só no servidor)
 *   PAYMENT_ENV         "production" (padrão) ou "sandbox"
 *   SITE_URL            domínio da loja (pro metadata; cai no host do request)
 *   PAYMENT_PROVIDER    nome curto da loja no metadata (padrão "rodalux")
 *   PAYMENT_WEBHOOK_URL opcional; se setada, vira o postbackUrl da transação
 */
export async function POST(req) {
  const p = await req.json().catch(() => ({}));

  // ---- validação mínima (não trava venda legítima) ----
  if (!Number.isInteger(p.amount_cents) || p.amount_cents <= 0) {
    return json({ error: "amount_cents inválido", status: 400 }, 400);
  }
  const c = p.customer || {};
  if (!c.name || !c.email || !(c.cpf || c.document)) {
    return json({ error: "Dados do cliente incompletos (nome, e-mail e CPF).", status: 400 }, 400);
  }
  const items = Array.isArray(p.items) && p.items.length ? p.items : null;
  if (!items) {
    return json({ error: "Carrinho vazio.", status: 400 }, 400);
  }

  /* ⚠️ TRAVA DE VALOR (o furo do site original): idealmente o servidor REFAZ a
     conta pelo catálogo antes de cobrar, pra ninguém fechar R$150 pagando R$1.
     Aqui o amount ainda vem do cliente — validar de verdade exige replicar no
     servidor a tabela de preços + desconto Pix + juros de parcela que hoje vivem
     no lp-tapetes.js/checkout.js. Fica como próximo passo; sem isso, a proteção
     é só a mínima acima. Não coloquei uma trava "amount == itens+frete" porque o
     desconto Pix e os juros quebram essa igualdade e bloqueariam venda real. */

  const origin =
    process.env.SITE_URL ||
    req.headers.get("origin") ||
    `https://${req.headers.get("host") || "tapecar.shop"}`;

  // ---- monta o corpo no formato da Beehive ----
  const body = {
    amount: p.amount_cents,
    paymentMethod: p.paymentMethod === "credit_card" ? "credit_card" : "pix",
    customer: {
      name: c.name,
      email: c.email,
      phone: c.phone || undefined,
      document: { type: "cpf", number: onlyDigits(c.cpf || c.document?.number || "") },
    },
    items: items.map((i) => ({
      title: i.title || i.name || "Produto",
      unitPrice: Number(i.unitPrice ?? i.price ?? 0),
      quantity: Number(i.quantity ?? i.qty ?? 1),
      tangible: i.tangible !== false,
    })),
    metadata: {
      provider: process.env.PAYMENT_PROVIDER || "rodalux",
      user_email: c.email,
      order_id: String(p.order_id || ""),
      checkout_url: `${origin}/checkout`,
      shop_url: origin,
    },
  };

  if (process.env.PAYMENT_WEBHOOK_URL) {
    body.postbackUrl = process.env.PAYMENT_WEBHOOK_URL;
  }

  if (body.paymentMethod === "pix") {
    body.pix = { expiresInSeconds: Number(p.pix_expires_seconds) || 1800 };
  } else {
    // cartão: o token foi gerado no front (BeehivePay.encrypt); nunca chega dado cru
    body.card = p.card_token || p.card;
    body.installments = Number(p.installments) || 1;
    if (!body.card) {
      return json({ error: "Cartão não tokenizado.", status: 400 }, 400);
    }
  }

  // ---- chama a Beehive ----
  const { ok, status, data } = await createBeehiveTransaction(body);

  if (!ok) {
    // repassa a mensagem da Beehive pro front (ele já sabe exibir data.error)
    return json(
      { error: data?.message || `Erro ao processar pagamento (${status})`, status },
      status >= 400 && status < 600 ? status : 502
    );
  }

  // ---- traduz a resposta da Beehive pro que o checkout.js espera ----
  const transactionId = data.id;
  const bhStatus = String(data.status || "").toLowerCase();

  if (body.paymentMethod === "pix") {
    const expiresAt = new Date(Date.now() + (body.pix.expiresInSeconds * 1000)).toISOString();
    return json({
      pixCode: data.qrCode || data.pix?.qrCode || "",
      transactionId,
      orderId: p.order_id || String(transactionId),
      pix_expires_at: expiresAt,
      status: bhStatus,
    });
  }

  // cartão
  return json({
    status: bhStatus, // "paid" | "authorized" | "refused" | "processing" | ...
    transactionId,
    orderId: p.order_id || String(transactionId),
    refusedReason: data.refusedReason || data.refuseReason || null,
  });
}

function onlyDigits(s) {
  return String(s || "").replace(/\D+/g, "");
}

function json(obj, status = 200) {
  return Response.json(obj, { status });
}
