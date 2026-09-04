export const dynamic = "force-dynamic";

/**
 * GET /api/admin/config-check — diagnóstico do que falta pro site rodar 100%.
 * NUNCA expõe valores de chave — só diz se cada variável está configurada.
 * Protegido pelo middleware (mesma senha do painel).
 */
export async function GET(req) {
  const has = (v) => !!(process.env[v] && String(process.env[v]).trim());

  const itens = [
    { grupo: "Pagamento", label: "Chave secreta da Beehive (PAYMENT_SECRET_KEY)", ok: has("PAYMENT_SECRET_KEY"), nivel: "obrigatorio",
      dica: "Processa os pagamentos e alimenta este painel. Beehive → Configurações → Credenciais." },
    { grupo: "Pagamento", label: "Chave pública da Beehive (PAYMENT_PUBLIC_KEY)", ok: has("PAYMENT_PUBLIC_KEY"), nivel: "obrigatorio",
      dica: "Sem ela o checkout nem liga — é o que tokeniza o cartão no navegador." },
    { grupo: "Pagamento", label: "Webhook de pagamento (PAYMENT_WEBHOOK_URL)", ok: has("PAYMENT_WEBHOOK_URL"), nivel: "recomendado",
      dica: "Aponte pra .../api/payment/webhook. Sem ela o Pix pago não vira 'Pago' sozinho nem dispara o rastreio." },
    { grupo: "Rastreio", label: "RastroCode — chave (RASTROCODE_API_KEY)", ok: has("RASTROCODE_API_KEY"), nivel: "recomendado",
      dica: "Gere na aba Configuração da RastroCode. Envia o pedido pago pra gerar o código de rastreio." },
    { grupo: "Painel", label: "Senha do painel (ADMIN_PASSWORD)", ok: has("ADMIN_PASSWORD"), nivel: "obrigatorio",
      dica: "Se você está vendo este painel, ela já está configurada." },
    { grupo: "Site", label: "Domínio da loja (SITE_URL)", ok: has("SITE_URL"), nivel: "recomendado",
      dica: "Ex.: https://rodalux.com.br — usado no metadata, canonical e no link do checkout." },
    { grupo: "Marketing", label: "Google Ads — ID (NEXT_PUBLIC_GOOGLE_ADS_ID)", ok: has("NEXT_PUBLIC_GOOGLE_ADS_ID"), nivel: "recomendado",
      dica: "ID AW- do Google Ads. Carrega o gtag no site pra rastreio e remarketing." },
    { grupo: "Marketing", label: "Google Ads — label de conversão (NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL)", ok: has("NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL"), nivel: "recomendado",
      dica: "Rótulo da conversão de compra. Sem ele a venda não é contada como conversão no Google Ads." },
    { grupo: "Opcional", label: "Gateway (PAYMENT_GATEWAY)", ok: has("PAYMENT_GATEWAY"), nivel: "opcional",
      dica: "Padrão: beehive. Só mude se trocar de gateway." },
    { grupo: "Opcional", label: "Ambiente (PAYMENT_ENV)", ok: has("PAYMENT_ENV"), nivel: "opcional",
      dica: "Padrão: production. Use 'sandbox' pra testar sem cobrar de verdade." },
  ];

  const faltamObrig = itens.filter((i) => i.nivel === "obrigatorio" && !i.ok).length;
  const faltamRec = itens.filter((i) => i.nivel === "recomendado" && !i.ok).length;

  return Response.json({
    pronto: faltamObrig === 0,
    faltamObrig,
    faltamRec,
    itens,
  });
}
