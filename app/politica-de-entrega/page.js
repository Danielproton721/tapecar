import LegacyPage from "../_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Política de Entrega | Tapecar",
  description: "Frete, prazo de entrega, rastreamento e o que fazer em caso de atraso ou problema na entrega.",
};

export default function PoliticaDeEntrega() {
  return (
    <LegacyPage
      html={legacyBody("politica-de-entrega.html")}
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
