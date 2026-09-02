import LegacyPage from "../_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Política de Privacidade | RodaLux",
  description: "Como a RodaLux coleta, usa, compartilha e protege os dados dos clientes.",
};

export default function PoliticaDePrivacidade() {
  return (
    <LegacyPage
      html={legacyBody("politica-de-privacidade.html")}
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
