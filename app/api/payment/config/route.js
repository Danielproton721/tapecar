export const dynamic = "force-dynamic";

/**
 * O checkout.js chama GET /api/payment/config no load pra saber a chave pública.
 * A única variável de ambiente aqui é PAYMENT_PUBLIC_KEY (a chave pública da
 * Beehive). O resto (gateway, SDK) é fixo — a loja usa Beehive.
 */
export async function GET() {
  const publicKey = process.env.PAYMENT_PUBLIC_KEY || "";

  if (!publicKey) {
    return Response.json({
      configured: false,
      error:
        "Gateway não configurado. Defina PAYMENT_PUBLIC_KEY nas variáveis de " +
        "ambiente da Vercel para ligar o checkout.",
      gateway: "beehive",
      testMode: true,
    });
  }

  return Response.json({
    configured: true,
    publicKey,
    testMode: false,
    gateway: "beehive",
    pixGateway: "beehive",
    cardGateway: "beehive",
    jsSdkUrl: "https://api.conta.paybeehive.com.br/v1/js",
    sdkGlobal: "BeehivePay",
  });
}
