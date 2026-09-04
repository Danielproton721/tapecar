import { listBeehiveTransactions } from "@/lib/beehive";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders — pedidos do dia (fuso de Brasília), pagos e pendentes,
 * com o gateway de cada um. Fonte da verdade: a própria Beehive (sem banco).
 * Protegido pelo middleware (Basic Auth) — só o dono acessa.
 */

const PAGO = new Set(["paid", "authorized"]);
const MORTO = new Set(["refused", "refunded", "canceled", "cancelled", "failed", "chargedback", "expired"]);

// Meia-noite de hoje no fuso de Brasília (UTC-3), em ms UTC.
function inicioDoDiaBR() {
  const agora = new Date();
  const br = new Date(agora.getTime() - 3 * 3600 * 1000);
  br.setUTCHours(0, 0, 0, 0);
  return br.getTime() + 3 * 3600 * 1000;
}

function ts(t) {
  return Date.parse(t.createdAt || t.created_at || t.paidAt || 0) || 0;
}

export async function GET() {
  const gateway = process.env.PAYMENT_GATEWAY || "beehive";

  if (!process.env.PAYMENT_SECRET_KEY) {
    return Response.json({
      configured: false,
      gateway,
      error: "Gateway não configurado. Defina PAYMENT_SECRET_KEY na Vercel para ver os pedidos.",
      pagos: [],
      pendentes: [],
    });
  }

  const desde = inicioDoDiaBR();
  const todas = [];

  // pagina até sair do dia (assume ordem mais-recente-primeiro) ou 8 páginas.
  for (let page = 1; page <= 8; page++) {
    const { ok, data } = await listBeehiveTransactions({ page });
    if (!ok) break;
    const lista = Array.isArray(data) ? data : data.data || data.transactions || data.items || [];
    if (!lista.length) break;
    todas.push(...lista);
    const ultima = lista[lista.length - 1];
    if (ts(ultima) && ts(ultima) < desde) break; // já passou do dia de hoje
  }

  const doDia = todas.filter((t) => ts(t) >= desde);

  const norm = (t) => ({
    id: t.id,
    cliente: t.customer?.name || "—",
    email: t.customer?.email || "",
    valor: (t.amount || 0) / 100,
    metodo: t.paymentMethod || t.payment_method || "—",
    status: String(t.status || "").toLowerCase(),
    hora: t.createdAt || t.created_at || null,
    gateway,
  });

  // lista única (pagos + pendentes), com a flag `pago` pra tag; descarta mortos.
  const pedidos = doDia
    .map((t) => {
      const s = String(t.status || "").toLowerCase();
      if (MORTO.has(s)) return null;
      return { ...norm(t), pago: PAGO.has(s) };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.hora || 0) - Date.parse(a.hora || 0)); // mais recente primeiro

  const nPagos = pedidos.filter((p) => p.pago).length;
  const faturado = pedidos.filter((p) => p.pago).reduce((s, p) => s + p.valor, 0);

  return Response.json({
    configured: true,
    gateway,
    data: new Date(desde).toISOString(),
    resumo: {
      pagos: nPagos,
      pendentes: pedidos.length - nPagos,
      faturado: Number(faturado.toFixed(2)),
    },
    pedidos,
  });
}
