"use client";

import Script from "next/script";

/**
 * Tag base do Google Ads (gtag). Carrega em todas as páginas só se o ID estiver
 * definido em NEXT_PUBLIC_GOOGLE_ADS_ID (ex.: AW-123456789). Sem o ID, não
 * carrega nada. O evento de conversão em si é disparado na /obrigado
 * (ver AdsConversion). O ID é público — vai pro navegador de propósito.
 */
export default function GoogleAds() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="gtag-base" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
          gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
