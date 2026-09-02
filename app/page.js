import LegacyPage from "./_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "CarTap | Tapetes Automotivos Sob Medida",
  description:
    "Tapetes automotivos tipo bandeja 3D, cortados nas medidas exatas do seu carro. Borda elevada que segura agua e barro. Envio para todo o Brasil.",
  alternates: { canonical: "/tapete-bandeja" },
};

export default function Home() {
  return (
    <LegacyPage
      html={legacyBody("lp.html")}
      styles={[
        "https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap",
        "/css/lp-tapetes.css",
      ]}
      scripts={["/js/tiktok-pixel.js", "/js/lp-tapetes.js"]}
    />
  );
}
