/** @type {import('next').NextConfig} */
const nextConfig = {
  // A LP mora em "/". Os anúncios antigos batem em "/tapete-bandeja"; o rewrite
  // serve a home nessa URL sem redirect (sem hop, sem perder o ttclid da query).
  async rewrites() {
    return [{ source: "/tapete-bandeja", destination: "/" }];
  },
};

export default nextConfig;
