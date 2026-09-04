"use client";

import { useEffect, useState } from "react";

/**
 * Caixa de código de rastreio na página de obrigado. Lê o transactionId do
 * pedido (sessionStorage), pede pro servidor confirmar o pagamento e gerar o
 * rastreio, e mostra o código. Só aparece quando o pagamento está confirmado.
 */
export default function Rastreio() {
  const [estado, setEstado] = useState("carregando"); // carregando | pago | pendente | erro
  const [code, setCode] = useState(null);

  useEffect(() => {
    let transactionId = "";
    try {
      const o = JSON.parse(sessionStorage.getItem("tapecar-order-v1") || "null");
      transactionId = o?.transactionId || "";
    } catch {
      /* ignore */
    }
    if (!transactionId) {
      setEstado("erro");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/order/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId }),
        });
        const j = await res.json();
        if (j.pago) {
          setCode(j.tracking_code || null);
          setEstado("pago");
        } else {
          setEstado("pendente");
        }
      } catch {
        setEstado("erro");
      }
    })();
  }, []);

  if (estado === "carregando" || estado === "erro") return null; // silencioso enquanto carrega / sem id

  return (
    <div className="rastreio-wrap">
      <style>{css}</style>
      {estado === "pendente" ? (
        <div className="rastreio pend">
          <strong>Pagamento em processamento</strong>
          <p>Assim que for confirmado, seu código de rastreio aparece aqui.</p>
        </div>
      ) : code ? (
        <div className="rastreio ok">
          <strong>✅ Pagamento confirmado</strong>
          <p>Seu código de rastreio:</p>
          <div className="code">{code}</div>
          <p className="hint">Guarde este código para acompanhar a entrega.</p>
        </div>
      ) : (
        <div className="rastreio ok">
          <strong>✅ Pagamento confirmado</strong>
          <p>Seu código de rastreio será enviado em breve por e-mail.</p>
        </div>
      )}
    </div>
  );
}

const css = `
  .rastreio-wrap{ max-width:520px; margin:16px auto; padding:0 16px; font-family:Rubik,system-ui,sans-serif; }
  .rastreio{ border-radius:14px; padding:18px 20px; text-align:center; }
  .rastreio.ok{ background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; }
  .rastreio.pend{ background:#fffbeb; border:1px solid #fde68a; color:#92400e; }
  .rastreio strong{ font-size:15px; display:block; }
  .rastreio p{ margin:6px 0 0; font-size:14px; }
  .rastreio .code{ margin:12px auto 4px; font-size:22px; font-weight:800; letter-spacing:2px;
    background:#fff; border:1px dashed #22c55e; border-radius:10px; padding:12px; color:#111; display:inline-block; }
  .rastreio .hint{ font-size:12px; opacity:.8; }
`;
