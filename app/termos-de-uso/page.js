import LegacyPage from "../_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Termos de Uso | CarTap",
  description: "Condições de uso do site, características do produto, compatibilidade, pagamento, checkout e garantia.",
};

export default function TermosDeUso() {
  return (
    <LegacyPage
      html={legacyBody("termos-de-uso.html")}
      styles={[
        "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@500;600;700;800&display=swap",
        "/css/style.css",
        "/css/paginas.css",
        "/css/fontes.css",
        "/css/tapetes.css",
      ]}
      scripts={["/js/tema.js"]}
    />
  );
}
