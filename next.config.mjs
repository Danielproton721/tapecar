// Versão dos assets legados (/public/js/*.js, /public/css/*.css). Esses arquivos
// têm nome fixo, sem hash, então o navegador cacheia e continua servindo a versão
// velha mesmo depois de um deploy novo — foi o que fez o checkout mostrar um erro
// de Pix já corrigido. Fixamos aqui, no build: o SHA do commit na Vercel (muda a
// cada deploy) ou, sem ele, o timestamp do build. O LegacyPage anexa ?v=ASSET_VERSION
// nas URLs, então todo deploy invalida o cache do navegador automaticamente.
const ASSET_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { ASSET_VERSION },
  // A LP mora em "/". Os anúncios antigos batem em "/tapete-bandeja"; o rewrite
  // serve a home nessa URL sem redirect (sem hop, sem perder o ttclid da query).
  async rewrites() {
    return [{ source: "/tapete-bandeja", destination: "/" }];
  },
};

export default nextConfig;
