/**
 * Página de obrigado.
 *
 * Os eventos de conversão (TikTok e analytics) já são disparados no checkout e
 * na tela do Pix, ANTES do redirecionamento — se fossem disparados aqui, uma
 * falha no redirect apagaria a venda das métricas. Esta página é confirmação
 * para o cliente e um destino de URL próprio, nada mais.
 */
const ORDER_KEY = "tapecar-order-v1";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function loadOrder() {
  try {
    const raw = sessionStorage.getItem(ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function orderIdFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get("pedido") || "";
  } catch {
    return "";
  }
}

function metodoLabel(method) {
  const m = String(method || "").toLowerCase();
  if (m.includes("pix")) return "Pix";
  if (m.includes("card") || m.includes("cartao") || m.includes("cartão")) return "Cartão de crédito";
  return "";
}

function init() {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const order = loadOrder();
  const id = (order && order.orderId) || orderIdFromUrl();

  const numero = document.getElementById("obrigado-numero");
  if (numero) numero.textContent = id || "—";

  const desc = document.getElementById("obrigado-desc");
  if (desc && order && order.email) {
    desc.textContent = `Você receberá em instantes um e-mail em ${order.email} com os detalhes do seu pedido.`;
  }

  const lead = document.getElementById("obrigado-lead");
  if (lead && order && order.status === "pending") {
    lead.textContent = "Pagamento em processamento";
    if (desc) {
      desc.textContent = order.email
        ? `Estamos confirmando o pagamento. Você receberá um e-mail em ${order.email} assim que for aprovado.`
        : "Estamos confirmando o pagamento do seu pedido.";
    }
  }

  const resumo = document.getElementById("obrigado-resumo");
  const metodo = metodoLabel(order && order.method);
  if (resumo && order && (metodo || order.total != null)) {
    const metodoEl = document.getElementById("obrigado-metodo");
    const totalEl = document.getElementById("obrigado-total");
    if (metodoEl) metodoEl.textContent = metodo || "—";
    if (totalEl) totalEl.textContent = order.total != null ? money(order.total) : "—";
    resumo.hidden = false;
  }

  window.TapecarAnalytics?.track?.("page_view", {
    meta: { page: "obrigado.html", orderId: id || null },
  });
}

init();
