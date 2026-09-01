import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lê um HTML original (pasta content/) e devolve só o miolo do <body>, sem as
 * tags <script> — esses são recarregados pela página via next/script, porque
 * script injetado com dangerouslySetInnerHTML não executa.
 *
 * Roda em build-time (as páginas são estáticas/SSG), então o fs aqui não custa
 * nada em produção: o resultado já sai embutido no HTML servido pela CDN.
 */
export function legacyBody(file) {
  const html = readFileSync(join(process.cwd(), "content", file), "utf8");
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = m ? m[1] : html;
  return body.replace(/<script[\s\S]*?<\/script>/gi, "");
}
