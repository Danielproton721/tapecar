import Script from "next/script";

// Cache-busting dos assets legados. Ver next.config.mjs: ASSET_VERSION muda a cada
// deploy, então a URL do JS/CSS muda e o navegador baixa a versão nova em vez de
// servir a antiga do cache. Só mexe em assets locais (começam com "/"); CDN de
// fontes (fonts.googleapis) já vem versionado.
const VER = process.env.ASSET_VERSION || "dev";
function withVer(url) {
  if (!url.startsWith("/")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${VER}`;
}

/**
 * Renderiza uma página legada: injeta o HTML original e recarrega os CSS/fontes
 * e os scripts que aquela página usava. É o que preserva a fidelidade pixel a
 * pixel — o markup é o mesmo do site estático, sem reescrever nada em JSX.
 *
 * @param {string}   html    miolo do <body> (via legacyBody)
 * @param {string[]} styles  hrefs de CSS/fontes, na ordem de carregamento
 * @param {string[]} scripts srcs de JS, na ordem de carregamento
 */
export default function LegacyPage({ html, styles = [], scripts = [] }) {
  return (
    <>
      {styles.map((href) => (
        <link key={href} rel="stylesheet" href={withVer(href)} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {scripts.map((src) => (
        <Script key={src} src={withVer(src)} strategy="afterInteractive" />
      ))}
    </>
  );
}
