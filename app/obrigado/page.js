import LegacyPage from "../_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Pedido confirmado | Tapecar",
  description: "Pedido confirmado — Tapecar.",
};

export default function Obrigado() {
  return (
    <LegacyPage
      html={legacyBody("obrigado.html")}
      styles={[
        "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
        "/css/checkout.css",
      ]}
      scripts={["/js/tiktok-pixel.js", "/js/analytics.js", "/js/obrigado.js"]}
    />
  );
}
