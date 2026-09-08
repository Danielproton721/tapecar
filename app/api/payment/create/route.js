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
 * Env vars usadas:
 *   PAYMENT_SECRET_KEY  chave secreta da Beehive (Basic auth, só no servidor)
 *   SITE_URL            domínio da loja (pro metadata; cai no host do request)
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
    `https://${req.headers.get("host") || "rodalux.com"}`;

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
      provider: "rodalux",
      user_email: c.email,
      order_id: String(p.order_id || ""),
      checkout_url: `${origin}/checkout`,
      shop_url: origin,
      // extras guardados pro /api/order/finalize montar o pedido da RastroCode
      // (a transação da Beehive não traz telefone nem endereço nativamente):
      customer_phone: onlyDigits(c.phone),
      addr_street: c.address?.street || "",
      addr_number: c.address?.number || "",
      addr_complement: c.address?.complement || "",
      addr_neighborhood: c.address?.neighborhood || "",
      addr_city: c.address?.city || "",
      addr_state: c.address?.state || "",
      addr_zip: onlyDigits(c.address?.zipcode || ""),
    },
  };

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
    // Acha o copia-e-cola do Pix em qualquer campo da resposta (independe do nome):
    // todo BR Code / Pix EMV começa com "000201".
    const pixCode = data.qrCode || data.pix?.qrCode || acharPixCode(data) || "";
    if (!pixCode) {
      // loga a resposta inteira pra diagnosticar o formato real (Vercel → Logs)
      console.error("[beehive] PIX criado mas sem código na resposta:", JSON.stringify(data));
    }
    return json({
      pixCode,
      transactionId,
      orderId: p.order_id || String(transactionId),
      pix_expires_at: expiresAt,
      status: bhStatus,
    });
  }

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

/** Varre a resposta e acha o copia-e-cola do Pix (string que começa com 000201),
 *  em qualquer campo/profundidade — não depende do nome do campo. */
function acharPixCode(obj, depth = 0) {
  if (obj == null || depth > 6) return null;
  if (typeof obj === "string") {
    const s = obj.trim();
    return s.startsWith("000201") && s.length > 40 ? s : null;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = acharPixCode(v, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      const r = acharPixCode(obj[k], depth + 1);
      if (r) return r;
    }
  }
  return null;
}

function json(obj, status = 200) {
  return Response.json(obj, { status });
}
