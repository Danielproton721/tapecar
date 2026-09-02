export const metadata = {
  metadataBase: new URL("https://www.tapecar.shop"),
  title: "CarTap | Tapetes Automotivos Sob Medida",
  description:
    "Tapetes automotivos tipo bandeja 3D, cortados nas medidas exatas do seu carro. Borda elevada que segura agua e barro. Envio para todo o Brasil.",
  icons: {
    icon: "/favicon.ico",
    apple: "/images/icone-tapecar-vermelho.png",
  },
  openGraph: {
    type: "website",
    siteName: "CarTap",
    title: "CarTap | Tapetes Automotivos Sob Medida",
    description: "Bandeja 3D com borda elevada, cortada para o seu modelo.",
    url: "https://www.tapecar.shop/tapete-bandeja",
    images: ["/images/socio-hero.webp"],
  },
  other: { "format-detection": "telephone=no,date=no,address=no,email=no,url=no" },
};

export const viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
};

import Script from "next/script";

// Os JS legados (lp-tapetes.js, tema.js) registram tudo dentro de
// document.addEventListener("DOMContentLoaded", …). No site estático o script
// ficava no fim do <body> e rodava ANTES desse evento. Aqui os scripts carregam
// via next/script (afterInteractive), DEPOIS do DOMContentLoaded já ter passado,
// então o listener nunca dispararia e o seletor de veículo (entre outros) morria.
// Este shim, instalado antes de qualquer outro script, faz um listener de
// DOMContentLoaded registrado com o DOM já pronto rodar no próximo tick.
const DOM_READY_SHIM = `(function(){
  if (window.__domReadyShim) return;
  window.__domReadyShim = true;
  var add = document.addEventListener.bind(document);
  document.addEventListener = function(type, cb, opts){
    if (type === "DOMContentLoaded" && document.readyState !== "loading" && typeof cb === "function"){
      setTimeout(function(){ try { cb(); } catch(e){ console.error(e); } }, 0);
      return;
    }
    return add(type, cb, opts);
  };
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Script id="dom-ready-shim" strategy="beforeInteractive">
          {DOM_READY_SHIM}
        </Script>
        {children}
      </body>
    </html>
  );
}
