import LegacyPage from "../_components/LegacyPage";
import AdsConversion from "../_components/AdsConversion";
import Rastreio from "../_components/Rastreio";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Pedido confirmado | RodaLux",
  description: "Pedido confirmado — RodaLux.",
};

export default function Obrigado() {
  return (
    <>
      <AdsConversion />
      <Rastreio />
      <LegacyPage
        html={legacyBody("obrigado.html")}
        styles={[
          "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
          "/css/checkout.css",
        ]}
        scripts={["/js/analytics.js", "/js/obrigado.js"]}
      />
    </>
  );
}
