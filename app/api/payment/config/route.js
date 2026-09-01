export const dynamic = "force-dynamic";

/**
 * O checkout.js chama GET /api/payment/config no load pra saber a chave pública
 * e o gateway. Aqui ela vem das variáveis de ambiente da Vercel — nunca fica
 * hardcoded no código (foi o vazamento do site original).
 *
 * Setar na Vercel: PAYMENT_PUBLIC_KEY (obrigatória p/ ligar o checkout),
 * PAYMENT_GATEWAY ("beehive" | "payout"), e opcionalmente PAYMENT_SDK_URL,
 * PAYMENT_SDK_GLOBAL, PAYMENT_TEST_MODE.
 */
export async function GET() {
  const publicKey = process.env.PAYMENT_PUBLIC_KEY || "";
  const gateway = process.env.PAYMENT_GATEWAY || "beehive";

  if (!publicKey) {
    return Response.json({
      configured: false,
      error:
        "Gateway não configurado. Defina PAYMENT_PUBLIC_KEY (e PAYMENT_GATEWAY) " +
        "nas variáveis de ambiente da Vercel para ligar o checkout.",
      gateway,
      testMode: true,
    });
  }

  const isPayout = gateway === "payout";
  return Response.json({
    configured: true,
    publicKey,
    testMode: process.env.PAYMENT_TEST_MODE === "true",
    gateway,
    pixGateway: gateway,
    cardGateway: gateway,
    jsSdkUrl:
      process.env.PAYMENT_SDK_URL ||
      (isPayout
        ? "https://api.payoutbr.com.br/v1/js"
        : "https://api.conta.paybeehive.com.br/v1/js"),
    sdkGlobal: process.env.PAYMENT_SDK_GLOBAL || (isPayout ? "Payout" : "BeehivePay"),
  });
}
