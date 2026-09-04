"use client";

import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/config-check", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        setConfig(await res.json());
      } catch (e) {
        setErro(e.message);
      }
    })();
  }, []);

  const itens = config?.itens || [];
  const nivelBadge = { obrigatorio: "obrig", recomendado: "recom", opcional: "opc" };
  const nivelLabel = { obrigatorio: "obrigatório", recomendado: "recomendado", opcional: "opcional" };

  return (
    <div className="wrap">
      <style>{css}</style>

      <header className="top">
        <div>
          <a className="voltar" href="/admin">← Voltar ao painel</a>
          <h1>Configuração <span>· RodaLux</span></h1>
        </div>
      </header>

      {erro ? <div className="aviso erro">Erro ao carregar: {erro}</div> : null}

      {!config && !erro ? <p className="vazio">Verificando configuração…</p> : null}

      {config ? (
        <>
          <div className={"status " + (config.pronto ? "ok" : "warn")}>
            {config.pronto
              ? "✅ Tudo essencial configurado — o site pode rodar."
              : `⚠️ Faltam ${config.faltamObrig} obrigatória(s)${config.faltamRec ? ` e ${config.faltamRec} recomendada(s)` : ""} pro site rodar 100%.`}
          </div>

          <ul className="list">
            {itens.map((it, i) => (
              <li key={i} className={it.ok ? "on" : "off"}>
                <span className="ic">{it.ok ? "✅" : "❌"}</span>
                <div className="body">
                  <div className="label">
                    {it.label}
                    <span className={"nivel " + nivelBadge[it.nivel]}>{nivelLabel[it.nivel]}</span>
                  </div>
                  <div className="dica">{it.dica}</div>
                </div>
              </li>
            ))}
          </ul>

          <p className="foot">
            Configure na Vercel em <b>Settings → Environment Variables</b> e faça um novo deploy.
            As variáveis <b>NEXT_PUBLIC_*</b> só valem depois de um deploy novo.
          </p>
        </>
      ) : null}
    </div>
  );
}

const css = `
  html,body{ margin:0; background:#0d0d12; }
  .wrap{ max-width:820px; margin:0 auto; padding:20px 16px 60px; color:#e7e7ee;
    font-family:Inter,system-ui,-apple-system,sans-serif; background:#0d0d12; min-height:100vh; }
  .top{ margin-bottom:20px; }
  .voltar{ color:#a78bfa; text-decoration:none; font-size:13px; font-weight:600; }
  .voltar:hover{ color:#c9b8f5; }
  .top h1{ margin:8px 0 0; font-size:22px; font-weight:800; } .top h1 span{ color:#7C3AED; font-weight:700; }
  .aviso{ background:#2a1518; border:1px solid #7a1a2a; color:#f59aa8; border-radius:10px; padding:14px 16px; font-size:14px; margin-bottom:18px; }
  .vazio{ color:#7a7a88; font-size:14px; background:#16161f; border:1px dashed #2b2b38; border-radius:12px; padding:20px; text-align:center; }
  .status{ border-radius:12px; padding:14px 16px; font-size:14px; font-weight:600; margin-bottom:18px; }
  .status.ok{ background:#123524; color:#4ade80; border:1px solid #1f5136; }
  .status.warn{ background:#33280f; color:#fbbf24; border:1px solid #5a4a1a; }
  .list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
  .list li{ display:flex; gap:12px; padding:14px; border-radius:12px; background:#16161f; border:1px solid #24242f; }
  .list li.off{ border-color:#4a2a2a; }
  .ic{ font-size:16px; line-height:1.4; flex:0 0 auto; }
  .label{ font-weight:600; font-size:14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .dica{ font-size:13px; color:#9a9aa8; margin-top:4px; line-height:1.5; }
  .nivel{ font-size:10px; text-transform:uppercase; letter-spacing:.04em; padding:2px 7px; border-radius:999px; font-weight:700; }
  .nivel.obrig{ background:#3a1a1a; color:#f87171; }
  .nivel.recom{ background:#33280f; color:#fbbf24; }
  .nivel.opc{ background:#24242f; color:#9a9aa8; }
  .foot{ font-size:13px; color:#8a8a98; margin:20px 0 0; line-height:1.6; }
  .foot b{ color:#c9b8f5; }
`;
