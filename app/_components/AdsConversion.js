"use client";

import { useEffect } from "react";

/**
 * Dispara a conversão do Google Ads na página de compra confirmada (/obrigado).
 * Só dispara se NEXT_PUBLIC_GOOGLE_ADS_ID e NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL
 * estiverem definidos. Empilha no dataLayer (não depende do gtag.js já ter
 * carregado) — quando o gtag.js carrega, processa a conversão com valor e id do
 * pedido, pra medir ROAS no Google Ads.
 */
export default function AdsConversion() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
    if (!id || !label) return;

    let value;
    let txid;
    try {
      const o = JSON.parse(sessionStorage.getItem("tapecar-order-v1") || "null");
      value = o?.total;
      txid = new URLSearchParams(location.search).get("pedido") || o?.orderId;
    } catch {
      /* segue sem valor — ainda conta a conversão */
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("event", "conversion", {
      send_to: `${id}/${label}`,
      value: value || undefined,
      currency: "BRL",
      transaction_id: txid || undefined,
    });
  }, []);

  return null;
}
