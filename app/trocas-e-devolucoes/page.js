import LegacyPage from "../_components/LegacyPage";
import { legacyBody } from "@/lib/legacy";

export const metadata = {
  title: "Trocas e Devoluções | CarTap",
  description: "Prazo de arrependimento, como solicitar a devolução, restituição de valores e garantia legal de 90 dias.",
};

export default function TrocasEDevolucoes() {
  return (
    <LegacyPage
      html={legacyBody("trocas-e-devolucoes.html")}
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
