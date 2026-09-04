import LegacyPage from "../_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Finalizar Compra | RodaLux",
  description: "Checkout seguro RodaLux — finalize seu pedido em 3 etapas.",
};

export default function Checkout() {
  return (
    <LegacyPage
      html={legacyBody("checkout.html")}
      styles={[
        "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
        "/css/checkout.css",
      ]}
      scripts={["/js/analytics.js", "/js/checkout.js"]}
    />
  );
}
