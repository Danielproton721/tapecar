/**
 * Cliente da API RastroCode (código de rastreio).
 * Doc: POST https://app.rastrocode.site/api/v1/orders — envia o pedido PAGO e
 * recebe um tracking_code. A X-API-Key vem de env var (RASTROCODE_API_KEY) e é
 * usada SÓ no servidor, nunca no frontend.
 *
 * Regras que a integração respeita:
 * - só envia quando o pagamento está confirmado (quem chama garante isso);
 * - transaction_id estável (o order_id do pedido) => reenvio não duplica;
 * - não retenta em 401/402/403/422 (erro que retentar não resolve);
 * - mapeia os campos exatamente (email só e-mail, phone só telefone, etc).
 */
const BASE = "https://app.rastrocode.site/api/v1";

const onlyDigits = (s) => String(s || "").replace(/\D+/g, "");

/**
 * Monta o corpo no formato da RastroCode a partir dos dados do pedido.
 * `valores` em centavos (padrão Beehive/checkout); converte pra reais aqui.
 */
export function montarPedidoRastroCode({ orderId, customer = {}, address = {}, items = [] }) {
  const products = (items || []).map((i) => ({
    name: String(i.title || i.name || "Produto").slice(0, 255),
    quantity: Math.max(1, Math.min(9999, Number(i.quantity ?? i.qty ?? 1))),
    price: Math.round(Number(i.unitPrice ?? i.price ?? 0)) / 100, // centavos -> reais
  }));

  // total = soma dos produtos (garante bater com Σ(price×qty), sem frete/juros
  // que quebrariam a tolerância de 1% da RastroCode).
  const total = Number(products.reduce((s, p) => s + p.price * p.quantity, 0).toFixed(2));

  return {
    transaction_id: String(orderId || "").slice(0, 50),
    customer: {
      name: String(customer.name || "").slice(0, 255),
      email: String(customer.email || "").trim().toLowerCase(),
      phone: onlyDigits(customer.phone),
      document: onlyDigits(customer.document || customer.cpf),
    },
    address: {
      street: String(address.street || "").slice(0, 255),
      number: String(address.number || "").slice(0, 20),
      complement: String(address.complement || "").slice(0, 255),
      neighborhood: String(address.neighborhood || "").slice(0, 255),
      city: String(address.city || "").slice(0, 255),
      state: String(address.state || "").toUpperCase().slice(0, 2),
      zipcode: onlyDigits(address.zipcode || address.zip_code || address.cep),
    },
    products: products.length ? products : [{ name: "Pedido", quantity: 1, price: total || 0.01 }],
    total: total || 0.01,
  };
}

/**
 * Envia o pedido pra RastroCode. Devolve { ok, status, data, skipped }.
 * Não lança — o caller decide o que logar. Nunca quebra o fluxo de pagamento.
 */
export async function enviarPedidoRastroCode(pedido) {
  const key = process.env.RASTROCODE_API_KEY || "";
  if (!key) {
    return { ok: false, skipped: true, reason: "RASTROCODE_API_KEY não configurada" };
  }

  let res;
  try {
    res = await fetch(`${BASE}/orders`, {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify(pedido),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, reason: `rede: ${e.message}` };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 422 traz data.error.details com o campo exato que falhou — logar isso ajuda muito.
    console.error("[rastrocode] erro", res.status, JSON.stringify(data));
  }
  return { ok: res.ok, status: res.status, data };
}
