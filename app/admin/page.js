"use client";

import { useEffect, useState, useCallback } from "react";

const BRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  const [config, setConfig] = useState(null);
  const [mostrarConfig, setMostrarConfig] = useState(false);

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

  const abrirConfig = useCallback(async () => {
    setMostrarConfig((v) => !v);
    if (!config) {
      try {
        const res = await fetch("/api/admin/config-check", { cache: "no-store" });
        setConfig(await res.json());
      } catch (e) {
        setConfig({ erro: e.message, itens: [] });
      }
    }
  }, [config]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 30000);
    return () => clearInterval(id);
  }, [carregar]);

  const resumo = dados?.resumo || { pagos: 0, pendentes: 0, faturado: 0, pendenteTotal: 0 };
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
        <div className="acts">
          <button className="btn ghost" onClick={abrirConfig}>⚙️ Configuração</button>
          <button className="btn" onClick={carregar} disabled={carregando}>
            {carregando ? "Atualizando…" : "↻ Atualizar"}
          </button>
        </div>
      </header>

      {mostrarConfig ? <ConfigPanel config={config} /> : null}

      {dados && dados.configured === false ? (
        <div className="aviso">
          ⚠️ {dados.error || "Gateway não configurado."}<br />
          Clique em <b>⚙️ Configuração</b> pra ver tudo que falta.
        </div>
      ) : null}

      {erro ? <div className="aviso erro">Erro ao carregar: {erro}</div> : null}

      <section className="cards">
        <div className="card pago">
          <span className="card__label">Pagos hoje</span>
          <span className="card__num">{resumo.pagos}</span>
        </div>
        <div className="card fat">
          <span className="card__label">Faturado hoje</span>
          <span className="card__num">{BRL(resumo.faturado)}</span>
        </div>
        <div className="card pend">
          <span className="card__label">Pendentes hoje</span>
          <span className="card__num">{resumo.pendentes}</span>
        </div>
        <div className="card pendval">
          <span className="card__label">Total pendente</span>
          <span className="card__num">{BRL(resumo.pendenteTotal)}</span>
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

function ConfigPanel({ config }) {
  if (!config) return <div className="cfg"><p className="vazio">Verificando configuração…</p></div>;
  const itens = config.itens || [];
  const nivelBadge = { obrigatorio: "obrig", recomendado: "recom", opcional: "opc" };
  const nivelLabel = { obrigatorio: "obrigatório", recomendado: "recomendado", opcional: "opcional" };

  return (
    <div className="cfg">
      <div className="cfg__head">
        <strong>O que falta pro site rodar 100%</strong>
        {config.pronto ? (
          <span className="cfg__ok">✅ Tudo essencial configurado</span>
        ) : (
          <span className="cfg__warn">⚠️ Faltam {config.faltamObrig} obrigatória(s){config.faltamRec ? `, ${config.faltamRec} recomendada(s)` : ""}</span>
        )}
      </div>
      <ul className="cfg__list">
        {itens.map((it, i) => (
          <li key={i} className={it.ok ? "on" : "off"}>
            <span className="cfg__ic">{it.ok ? "✅" : "❌"}</span>
            <div className="cfg__body">
              <div className="cfg__label">
                {it.label}
                <span className={"cfg__nivel " + nivelBadge[it.nivel]}>{nivelLabel[it.nivel]}</span>
              </div>
              <div className="cfg__dica">{it.dica}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="cfg__foot">Configure na Vercel em <b>Settings → Environment Variables</b> e faça um novo deploy.</p>
    </div>
  );
}

const css = `
  .wrap{ max-width:1000px; margin:0 auto; padding:20px 16px 60px; color:#e7e7ee;
    font-family:Inter,system-ui,-apple-system,sans-serif; background:#0d0d12; min-height:100vh; }
  .top{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
  .top h1{ margin:0; font-size:22px; font-weight:800; } .top h1 span{ color:#7C3AED; }
  .sub{ margin:4px 0 0; font-size:13px; color:#9a9aa8; } .sub b{ color:#c9b8f5; text-transform:capitalize; }
  .acts{ display:flex; gap:8px; }
  .btn{ background:#7C3AED; color:#fff; border:0; border-radius:10px; padding:10px 16px; font-size:14px; font-weight:600; cursor:pointer; transition:.15s; }
  .btn:hover{ background:#6d28d9; } .btn:disabled{ opacity:.6; cursor:default; }
  .btn.ghost{ background:transparent; border:1px solid #3a3a48; color:#c9c9d4; }
  .btn.ghost:hover{ border-color:#7C3AED; color:#fff; }
  .aviso{ background:#2a2118; border:1px solid #7a5c1a; color:#f5d68a; border-radius:10px; padding:14px 16px; font-size:14px; margin-bottom:18px; line-height:1.5; }
  .aviso.erro{ background:#2a1518; border-color:#7a1a2a; color:#f59aa8; }
  .cards{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:26px; }
  .card{ background:#16161f; border:1px solid #24242f; border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:6px; }
  .card__label{ font-size:12px; color:#9a9aa8; text-transform:uppercase; letter-spacing:.04em; }
  .card__num{ font-size:24px; font-weight:800; }
  .card.pago{ border-color:#1f5136; } .card.pago .card__num{ color:#4ade80; }
  .card.fat{ border-color:#3b2a63; } .card.fat .card__num{ color:#a78bfa; }
  .card.pend{ border-color:#5a4a1a; } .card.pend .card__num{ color:#fbbf24; }
  .card.pendval{ border-color:#5a3a1a; } .card.pendval .card__num{ color:#fb923c; }
  .bloco{ margin-bottom:28px; } .bloco h2{ font-size:16px; margin:0 0 12px; } .cnt{ color:#9a9aa8; font-weight:500; }
  .vazio{ color:#7a7a88; font-size:14px; background:#16161f; border:1px dashed #2b2b38; border-radius:12px; padding:20px; text-align:center; }
  .tabwrap{ overflow-x:auto; border:1px solid #24242f; border-radius:12px; }
  table{ width:100%; border-collapse:collapse; font-size:14px; min-width:600px; }
  thead th{ text-align:left; padding:11px 14px; background:#16161f; color:#9a9aa8; font-size:12px; text-transform:uppercase; border-bottom:1px solid #24242f; }
  tbody td{ padding:11px 14px; border-bottom:1px solid #1c1c26; vertical-align:top; }
  tbody tr:last-child td{ border-bottom:0; }
  .mono{ font-variant-numeric:tabular-nums; } .val{ font-weight:700; }
  .cli{ font-weight:600; } .mail{ font-size:12px; color:#8a8a98; }
  .gw{ text-transform:capitalize; color:#c9b8f5; }
  .tag{ display:inline-block; padding:4px 11px; border-radius:999px; font-size:12px; font-weight:700; white-space:nowrap; }
  .tag--pago{ background:#123524; color:#4ade80; border:1px solid #1f5136; }
  .tag--pend{ background:#33280f; color:#fbbf24; border:1px solid #5a4a1a; }
  .cfg{ background:#14141c; border:1px solid #2b2b38; border-radius:14px; padding:18px; margin-bottom:22px; }
  .cfg__head{ display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
  .cfg__head strong{ font-size:15px; }
  .cfg__ok{ color:#4ade80; font-size:13px; font-weight:600; }
  .cfg__warn{ color:#fbbf24; font-size:13px; font-weight:600; }
  .cfg__list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
  .cfg__list li{ display:flex; gap:12px; padding:12px; border-radius:10px; background:#1a1a24; border:1px solid #24242f; }
  .cfg__list li.off{ border-color:#4a2a2a; }
  .cfg__ic{ font-size:15px; line-height:1.4; flex:0 0 auto; }
  .cfg__label{ font-weight:600; font-size:14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .cfg__dica{ font-size:12.5px; color:#9a9aa8; margin-top:3px; line-height:1.5; }
  .cfg__nivel{ font-size:10px; text-transform:uppercase; letter-spacing:.04em; padding:2px 7px; border-radius:999px; font-weight:700; }
  .cfg__nivel.obrig{ background:#3a1a1a; color:#f87171; }
  .cfg__nivel.recom{ background:#33280f; color:#fbbf24; }
  .cfg__nivel.opc{ background:#24242f; color:#9a9aa8; }
  .cfg__foot{ font-size:12.5px; color:#8a8a98; margin:14px 0 0; }
  .cfg__foot b{ color:#c9b8f5; }
  @media (max-width:640px){ .cards{ grid-template-columns:repeat(2,1fr); } .card__num{ font-size:22px; } }
`;
