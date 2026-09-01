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
| `/api/payment/config` | serve a chave pública do gateway (das env vars) |
| `/api/payment/create` | cria PIX/cartão — **stub, implementar** |
| `/api/cart-abandoned` | carrinho abandonado — stub |

## Antes de rodar tráfego (pendências do dono original)

1. **Pixel do TikTok** — `public/js/tiktok-pixel.js` está com `PIXEL_ID` vazio (o do
   dono foi removido). Cole o seu id e ajuste `HOSTS_PRODUCAO` pro seu domínio.
2. **Gateway** — env vars + implementar `/api/payment/create`. **Refaça a conta no
   servidor** antes de cobrar; nunca confie no `amount_cents` do cliente.
3. **Dados fiscais** — CNPJ, razão social e `ajuda@tapecar.shop` no rodapé e nas 4
   políticas ainda são do dono original.
4. **Peso** — `public/media/` são ~22 MB de vídeo. `preload` já é `metadata`/`none`,
   mas vale reencodar antes de escalar.

## Prova social (popup "comprou agora")

**Removida** a pedido. Guardada em `../tapecar-clone/backups/prova-social/` com
README de como religar.
