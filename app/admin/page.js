"use client";

import { useEffect, useState, useCallback } from "react";

const BRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  } catch {
    return "—";
  }
};
const metodoLabel = (m) => (m === "credit_card" ? "Cartão" : m === "pix" ? "Pix" : m === "boleto" ? "Boleto" : m || "—");

export default function Admin() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [atualizado, setAtualizado] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
      setDados(json);
      setAtualizado(new Date());
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 30000); // auto-refresh 30s
    return () => clearInterval(id);
  }, [carregar]);

  const resumo = dados?.resumo || { pagos: 0, pendentes: 0, faturado: 0 };
  const pedidos = dados?.pedidos || [];

  return (
    <div className="wrap">
      <style>{css}</style>

      <header className="top">
        <div>
          <h1>RodaLux <span>· Painel</span></h1>
          <p className="sub">
            Pedidos de hoje{dados?.gateway ? <> · gateway <b>{dados.gateway}</b></> : null}
            {atualizado ? <> · atualizado {hora(atualizado.toISOString())}</> : null}
          </p>
        </div>
        <button className="btn" onClick={carregar} disabled={carregando}>
          {carregando ? "Atualizando…" : "↻ Atualizar"}
        </button>
      </header>

      {dados && dados.configured === false ? (
        <div className="aviso">
          ⚠️ {dados.error || "Gateway não configurado."}<br />
          Defina <code>PAYMENT_SECRET_KEY</code> nas variáveis de ambiente pra ver os pedidos.
        </div>
      ) : null}

      {erro ? <div className="aviso erro">Erro ao carregar: {erro}</div> : null}

      <section className="cards">
        <div className="card pago">
          <span className="card__label">Pagos hoje</span>
          <span className="card__num">{resumo.pagos}</span>
        </div>
        <div className="card pend">
          <span className="card__label">Pendentes hoje</span>
          <span className="card__num">{resumo.pendentes}</span>
        </div>
        <div className="card fat">
          <span className="card__label">Faturado hoje</span>
          <span className="card__num">{BRL(resumo.faturado || 0)}</span>
        </div>
      </section>

      <section className="bloco">
        <h2>Pedidos de hoje {pedidos.length ? <span className="cnt">({pedidos.length})</span> : null}</h2>
        {pedidos.length === 0 ? (
          <p className="vazio">Nenhum pedido hoje ainda.</p>
        ) : (
          <div className="tabwrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th><th>Hora</th><th>Cliente</th><th>Valor</th><th>Método</th><th>Gateway</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className={"tag " + (p.pago ? "tag--pago" : "tag--pend")}>
                        {p.pago ? "● Pago" : "● Pendente"}
                      </span>
                    </td>
                    <td className="mono">{hora(p.hora)}</td>
                    <td>
                      <div className="cli">{p.cliente}</div>
                      <div className="mail">{p.email}</div>
                    </td>
                    <td className="mono val">{BRL(p.valor)}</td>
                    <td>{metodoLabel(p.metodo)}</td>
                    <td className="gw">{p.gateway}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const css = `
  .wrap{ max-width:1000px; margin:0 auto; padding:20px 16px 60px; color:#e7e7ee;
    font-family:Inter,system-ui,-apple-system,sans-serif; background:#0d0d12; min-height:100vh; }
  .top{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
  .top h1{ margin:0; font-size:22px; font-weight:800; }
  .top h1 span{ color:#7C3AED; font-weight:700; }
  .sub{ margin:4px 0 0; font-size:13px; color:#9a9aa8; }
  .sub b{ color:#c9b8f5; text-transform:capitalize; }
  .btn{ background:#7C3AED; color:#fff; border:0; border-radius:10px; padding:10px 16px;
    font-size:14px; font-weight:600; cursor:pointer; transition:.15s; }
  .btn:hover{ background:#6d28d9; } .btn:disabled{ opacity:.6; cursor:default; }
  .aviso{ background:#2a2118; border:1px solid #7a5c1a; color:#f5d68a; border-radius:10px;
    padding:14px 16px; font-size:14px; margin-bottom:18px; line-height:1.5; }
  .aviso.erro{ background:#2a1518; border-color:#7a1a2a; color:#f59aa8; }
  .aviso code{ background:rgba(255,255,255,.1); padding:1px 6px; border-radius:5px; }
  .cards{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:26px; }
  .card{ background:#16161f; border:1px solid #24242f; border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:6px; }
  .card__label{ font-size:12px; color:#9a9aa8; text-transform:uppercase; letter-spacing:.04em; }
  .card__num{ font-size:26px; font-weight:800; }
  .card.pago{ border-color:#1f5136; } .card.pago .card__num{ color:#4ade80; }
  .card.pend{ border-color:#5a4a1a; } .card.pend .card__num{ color:#fbbf24; }
  .card.fat{ border-color:#3b2a63; } .card.fat .card__num{ color:#a78bfa; }
  .bloco{ margin-bottom:28px; }
  .bloco h2{ font-size:16px; margin:0 0 12px; }
  .bloco h2 .cnt{ color:#9a9aa8; font-weight:500; }
  .vazio{ color:#7a7a88; font-size:14px; background:#16161f; border:1px dashed #2b2b38; border-radius:12px; padding:20px; text-align:center; }
  .tabwrap{ overflow-x:auto; border:1px solid #24242f; border-radius:12px; }
  table{ width:100%; border-collapse:collapse; font-size:14px; min-width:600px; }
  thead th{ text-align:left; padding:11px 14px; background:#16161f; color:#9a9aa8;
    font-size:12px; text-transform:uppercase; letter-spacing:.03em; border-bottom:1px solid #24242f; }
  tbody td{ padding:11px 14px; border-bottom:1px solid #1c1c26; vertical-align:top; }
  tbody tr:last-child td{ border-bottom:0; }
  .mono{ font-variant-numeric:tabular-nums; }
  .val{ font-weight:700; }
  .cli{ font-weight:600; } .mail{ font-size:12px; color:#8a8a98; }
  .gw{ text-transform:capitalize; color:#c9b8f5; }
  .tag{ display:inline-block; padding:4px 11px; border-radius:999px; font-size:12px; font-weight:700; white-space:nowrap; }
  .tag--pago{ background:#123524; color:#4ade80; border:1px solid #1f5136; }
  .tag--pend{ background:#33280f; color:#fbbf24; border:1px solid #5a4a1a; }
  @media (max-width:560px){ .cards{ grid-template-columns:1fr; } .card__num{ font-size:22px; } }
`;
