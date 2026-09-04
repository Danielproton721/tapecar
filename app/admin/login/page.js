"use client";

import { useState } from "react";

export default function Login() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (res.ok) {
        window.location.href = "/admin";
        return;
      }
      const j = await res.json().catch(() => ({}));
      setErro(j.error || "Senha incorreta.");
    } catch {
      setErro("Falha ao entrar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="wrap">
      <style>{css}</style>
      <form className="box" onSubmit={entrar}>
        <h1>RodaLux <span>· Painel</span></h1>
        <p className="sub">Digite a senha pra acessar</p>

        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          autoFocus
          autoComplete="current-password"
        />

        {erro ? <div className="erro">{erro}</div> : null}

        <button type="submit" disabled={enviando || !senha}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

const css = `
  html,body{ margin:0; background:#0d0d12; }
  .wrap{ min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;
    background:#0d0d12; color:#e7e7ee; font-family:Inter,system-ui,-apple-system,sans-serif; }
  .box{ width:100%; max-width:340px; background:#16161f; border:1px solid #24242f; border-radius:16px;
    padding:28px 24px; display:flex; flex-direction:column; gap:14px; }
  .box h1{ margin:0; font-size:20px; font-weight:800; text-align:center; }
  .box h1 span{ color:#7C3AED; }
  .sub{ margin:0 0 6px; font-size:13px; color:#9a9aa8; text-align:center; }
  input{ width:100%; box-sizing:border-box; background:#0d0d12; border:1px solid #2b2b38; border-radius:10px;
    padding:12px 14px; font-size:15px; color:#e7e7ee; outline:none; transition:border-color .15s; }
  input:focus{ border-color:#7C3AED; }
  .erro{ background:#2a1518; border:1px solid #7a1a2a; color:#f59aa8; border-radius:9px; padding:9px 12px; font-size:13px; }
  button{ background:#7C3AED; color:#fff; border:0; border-radius:10px; padding:12px; font-size:15px; font-weight:700; cursor:pointer; transition:.15s; }
  button:hover{ background:#6d28d9; } button:disabled{ opacity:.55; cursor:default; }
`;
