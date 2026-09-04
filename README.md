# Tapecar — Next.js (Vercel)

LP do tapete bandeja + checkout, migrada de HTML estático para **Next.js 15 (App
Router)**, pronta pra Vercel. Migrada em 01/09/2026.

## Como foi feita (e por que assim)

O site original é HTML/CSS/JS estático. **Não reescrevi 8000px de layout em JSX** —
isso reintroduz bugs. Em vez disso, o HTML/CSS/JS originais viraram **assets
intactos**, e o Next só faz o embrulho:

- As páginas (`app/**/page.js`) injetam o markup original com `dangerouslySetInnerHTML`
  e recarregam o CSS/JS de cada página. São **estáticas (SSG)** — servidas pela CDN.
- O CSS/JS legado vive em `public/` (`public/css`, `public/js`).
- O HTML original de cada página vive em `content/` e é lido em build-time por
  `lib/legacy.js` (extrai o `<body>`, remove os `<script>`, que são recarregados
  via `next/script`).
- O que era `server.mjs` (stubs de API) virou **API routes serverless** em
  `app/api/**`.

**Fidelidade validada** em 390×844 contra o site no ar: altura 8024px = 8024px,
13 seções idênticas, seletor de veículo (33 marcas / 521 modelos) funcionando nos
três caminhos (cascata, busca, modelo livre), 0 erro de console.

### O detalhe que quebrava e foi consertado

O `lp-tapetes.js` registra tudo dentro de `DOMContentLoaded`. No site estático o
script rodava no fim do `<body>`, antes desse evento. Via `next/script`
(afterInteractive) ele roda **depois**, e o listener nunca dispararia — o seletor
morria. O `layout.js` instala um **shim** (`beforeInteractive`) que faz um
`DOMContentLoaded` registrado com o DOM já pronto rodar mesmo assim. Não toquei na
estrutura dos JS originais.

## Rodar local

```bash
npm install
npm run dev      # http://localhost:3010
```

Produção local:

```bash
npm run build && npm run start
```

## Deploy na Vercel

1. Suba o projeto (git ou `vercel`). O framework é detectado como Next.js — sem
   config extra.
2. Em **Settings → Environment Variables**, defina o gateway (ver `.env.example`):
   - `PAYMENT_PUBLIC_KEY` — chave pública do SEU gateway (obrigatória p/ ligar o checkout)
   - `PAYMENT_GATEWAY` — `beehive` ou `payout`
   - `PAYMENT_SECRET_KEY` — secreta, usada só no servidor
3. Implemente a cobrança real em `app/api/payment/create/route.js` (hoje é stub).

## Rotas

| Rota | O que é |
|---|---|
| `/` (e `/tapete-bandeja`, via rewrite) | LP |
| `/checkout` | checkout 3 passos |
| `/pix` | tela do QR code Pix |
| `/obrigado` | pós-compra |
| `/politica-de-entrega`, `/politica-de-privacidade`, `/termos-de-uso`, `/trocas-e-devolucoes` | páginas legais |
| `/admin` | **painel de pedidos do dia** (protegido por senha) |
| `/api/payment/config` | serve a chave pública do gateway (das env vars) |
| `/api/payment/create` | **cria PIX/cartão na Beehive Pay** (implementado — só faltam as chaves) |
| `/api/admin/orders` | pedidos do dia da Beehive (protegido) |
| `/api/cart-abandoned` | carrinho abandonado — stub |

## Painel admin (`/admin`)

Painel só do dono pra acompanhar as vendas do dia: lista única de pedidos com tag
**Pago/Pendente**, valor, método, gateway, e cards de resumo (pagos, pendentes,
faturado). Auto-atualiza a cada 30s. Os dados vêm direto da Beehive (sem banco).

**Protegido por Basic Auth (fail-closed):** sem `ADMIN_USER` e `ADMIN_PASSWORD`
nas env vars, o painel **não abre pra ninguém** (o middleware nega tudo). Defina
as duas na Vercel + a `PAYMENT_SECRET_KEY` (pros pedidos aparecerem) e acesse
`seudominio.com/admin` — o navegador pede usuário e senha.

## Gateway Beehive Pay (já integrado)

A cobrança está implementada em `lib/beehive.js` + `app/api/payment/create/route.js`
(PIX e cartão, `POST https://api.conta.paybeehive.com.br/v1/transactions`, Basic auth).
Pra ligar, só faltam as chaves nas env vars (ver `.env.example`):
`PAYMENT_PUBLIC_KEY`, `PAYMENT_SECRET_KEY`, `SITE_URL`. Sem elas, o checkout avisa
"gateway não configurado" e não cobra nada.

⚠️ **Trava de valor pendente:** o `amount_cents` ainda vem do cliente. A trava real
(refazer a conta no servidor) exige replicar a tabela de preços + desconto Pix +
juros de parcela que hoje vivem no JS do front. Está marcado como TODO no route.

## Antes de rodar tráfego (pendências do dono original)

1. **Chaves do gateway** — `PAYMENT_PUBLIC_KEY` + `PAYMENT_SECRET_KEY` na Vercel.
2. **Webhook** — implementar `/api/payment/webhook` + setar `PAYMENT_WEBHOOK_URL`,
   senão o PIX não confirma sozinho (Beehive avisa o pagamento por postback).
3. **Pixel do TikTok** — `public/js/tiktok-pixel.js` está com `PIXEL_ID` vazio (o do
   dono foi removido). Cole o seu id e ajuste `HOSTS_PRODUCAO` pro seu domínio.
4. **Dados fiscais** — CNPJ, endereço e e-mail de contato estão como placeholders
   (`__CNPJ__`, `__ENDERECO__`, `__EMAIL_CONTATO__`) no rodapé e nas 4 políticas.
   Preencher com os dados da RodaLux antes de publicar.
5. **Domínio** — trocar `tapecar.shop` dos `canonical`/`og` pelo domínio próprio
   (`rodalux.com.br`) e apontar `SITE_URL` na Vercel.
6. **Peso** — `public/media/` são ~22 MB de vídeo. `preload` já é `metadata`/`none`,
   mas vale reencodar antes de escalar.

## Prova social (popup "comprou agora")

**Removida** a pedido. Guardada em `../tapecar-clone/backups/prova-social/` com
README de como religar.
