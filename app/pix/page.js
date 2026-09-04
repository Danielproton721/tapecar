import LegacyPage from "../_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Pagamento Pix | RodaLux",
  description: "Conclua seu pagamento Pix — RodaLux.",
};

export default function Pix() {
  return (
    <LegacyPage
      html={legacyBody("pix.html")}
      styles={[
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap",
        "/css/pix.css",
      ]}
      scripts={["/js/analytics.js", "/js/pix.js"]}
    />
  );
}
