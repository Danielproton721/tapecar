import Script from "next/script";

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
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {scripts.map((src) => (
        <Script key={src} src={src} strategy="afterInteractive" />
      ))}
    </>
  );
}
