/**
 * Cliente da API da Beehive Pay (gateway do checkout).
 * Doc: https://docs.beehivehub.io — base https://api.conta.paybeehive.com.br/v1
 *
 * A SECRET_KEY vem de env var (PAYMENT_SECRET_KEY) e é usada SÓ aqui no servidor,
 * nunca vai pro cliente. Auth é Basic com base64("SECRET_KEY:x").
 */

const BASE = {
  production: "https://api.conta.paybeehive.com.br/v1",
  sandbox: "https://api.sandbox.hopysplit.com.br/v1",
};

function apiBase() {
  return process.env.PAYMENT_ENV === "sandbox" ? BASE.sandbox : BASE.production;
}

function authHeader(secretKey) {
  // Beehive: Authorization: Basic base64(SECRET_KEY:x)
  const token = Buffer.from(`${secretKey}:x`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Cria uma transação na Beehive. Recebe o corpo já no formato da Beehive
 * (TransactionCreateRequest). Devolve { ok, status, data } — data é o JSON da
 * Beehive (com id, status, qrCode no caso do PIX, etc.) ou o erro dela.
 */
export async function createBeehiveTransaction(body) {
  const secretKey = process.env.PAYMENT_SECRET_KEY || "";
  if (!secretKey) {
    return {
      ok: false,
      status: 501,
      data: {
        message:
          "PAYMENT_SECRET_KEY não configurada. Defina a chave secreta do gateway " +
          "nas variáveis de ambiente da Vercel para processar pagamentos.",
      },
    };
  }

  let res;
  try {
    res = await fetch(`${apiBase()}/transactions`, {
      method: "POST",
      headers: {
        Authorization: authHeader(secretKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // sem cache — é uma cobrança
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, status: 502, data: { message: `Falha de rede ao falar com o gateway: ${e.message}` } };
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Lista transações da Beehive (GET /transactions), paginado. Usado pelo painel
 * admin. `page` a partir de 1; `status` opcional filtra no gateway.
 */
export async function listBeehiveTransactions({ page = 1, status } = {}) {
  const secretKey = process.env.PAYMENT_SECRET_KEY || "";
  if (!secretKey) {
    return { ok: false, status: 501, data: { message: "PAYMENT_SECRET_KEY não configurada." } };
  }

  const url = new URL(`${apiBase()}/transactions`);
  url.searchParams.set("page", String(page));
  if (status) url.searchParams.set("status", status);

  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: authHeader(secretKey), "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, status: 502, data: { message: `Falha de rede ao falar com o gateway: ${e.message}` } };
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
