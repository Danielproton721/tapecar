/**
 * TikTok Pixel — base + helpers compartilhados (LP, checkout e Pix).
 *
 * Mesmo ID usado na landing page. Carregue este arquivo no <head> de
 * QUALQUER página que precise medir o funil.
 *
 * Funil:
 *   LP        → ViewContent (produto), AddToCart (modal de revisão)
 *   Checkout  → InitiateCheckout (entrou), AddPaymentInfo (clicou finalizar)
 *   Pagamento → CompletePayment (cartão aprovado / Pix confirmado)
 *
 * Pix gerado e cartão pendente NÃO disparam evento de compra: só pedido
 * efetivamente pago conta como conversão.
 *
 * O pixel SÓ carrega nos domínios de produção listados em HOSTS_PRODUCAO.
 * Em preview da Vercel, localhost ou qualquer outro host ele fica inerte —
 * assim os testes não sujam os dados da campanha que já está no ar.
 * ?pixel=1 liga e ?pixel=0 desliga, valendo para a sessão inteira e vencendo
 * a lista de hosts — dá para testar uma compra em produção sem contaminar a
 * campanha, e ligar num ambiente de teste quando quiser validar o funil.
 *
 * Ao instalar ou remover qualquer ferramenta, atualize a
 * Política de Privacidade (politica-de-privacidade.html, seção 3).
 */
(function () {
/* ===========================================================================
   PREENCHER ANTES DE PUBLICAR — os dois valores abaixo
   ===========================================================================

   PIXEL_ID       o id do pixel do TikTok desta loja. Enquanto estiver vazio
                  o arquivo carrega e expoe a API, mas NAO chama ttq.load e
                  nao envia nada. O id anterior era de outra loja e foi
                  retirado de proposito.

   HOSTS_PRODUCAO os dominios onde o pixel pode disparar. Fora deles ele fica
                  inerte, para preview da Vercel e localhost nao sujarem os
                  dados da campanha. Se o dominio final nao for tapecar.shop,
                  troque aqui — senao o pixel nunca dispara em producao.
   =========================================================================== */
var PIXEL_ID = ""; // CLONE: id do pixel do dono original removido. Cole o SEU aqui.

var HOSTS_PRODUCAO = []; // CLONE: coloque o SEU dominio de producao aqui.

var FORCE_KEY = "tapecar-pixel-force-v1";

/**
 * Produção sempre carrega. Fora dela, ?pixel=1 liga o pixel e a marca fica
 * guardada na sessão — assim o funil inteiro (LP → checkout → pix) mede,
 * mesmo nas navegações que não levam a query string junto.
 */
function pixelHabilitado() {
  try {
    // Escolha explicita vence sempre — inclusive em producao, para voce poder
    // navegar e testar no proprio site sem sujar os dados da campanha.
    var escolha = new URLSearchParams(window.location.search).get("pixel");
    if (escolha === "0" || escolha === "1") {
      try {
        sessionStorage.setItem(FORCE_KEY, escolha);
      } catch (err) {
        /* segue sem persistir */
      }
      return escolha === "1";
    }
    // Sem parametro: vale a escolha da sessao, para o funil inteiro
    var salvo = sessionStorage.getItem(FORCE_KEY);
    if (salvo === "0") return false;
    if (salvo === "1") return true;
    return HOSTS_PRODUCAO.indexOf(window.location.hostname) !== -1;
  } catch (err) {
    return false;
  }
}

if (!PIXEL_ID) {
  console.info(
    "[TikTok] PIXEL_ID vazio em tiktok-pixel.js — nenhum evento sera enviado. " +
      "Preencha o id no topo do arquivo."
  );
} else if (!pixelHabilitado()) {
  console.info(
    "[TikTok] pixel desativado em " + window.location.hostname +
      " (host fora da produção). Use ?pixel=1 para forçar."
  );
} else
(function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
  var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
  ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

  ttq.load(PIXEL_ID);
  ttq.page();
})(window, document, 'ttq');
})();

(function (global) {
  "use strict";

  var CURRENCY = "BRL";
  var PRODUTO_PADRAO = "Tapetes Automotivos Sob Medida";

  function ttq() {
    return global.ttq || null;
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  /** TikTok exige e-mail minúsculo e sem espaços; o SDK faz o hash SHA-256. */
  function normalizeEmail(value) {
    var email = String(value || "").trim().toLowerCase();
    return email.indexOf("@") > 0 ? email : "";
  }

  /** Telefone precisa ir em E.164 (+55DDDNUMERO). */
  function normalizePhone(value) {
    var digits = onlyDigits(value);
    if (!digits) return "";
    if (digits.length === 10 || digits.length === 11) return "+55" + digits;
    if (digits.length === 12 || digits.length === 13) return "+" + digits;
    return "";
  }

  function slug(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /**
   * Advanced matching. Sem isso o TikTok casa muito menos conversão.
   * @param {{email?:string, phone?:string, cpf?:string}} user
   */
  function identify(user) {
    var pixel = ttq();
    if (!pixel || !user) return;
    var payload = {};
    var email = normalizeEmail(user.email);
    var phone = normalizePhone(user.phone);
    var externalId = onlyDigits(user.cpf || user.document || "");
    if (email) payload.email = email;
    if (phone) payload.phone_number = phone;
    if (externalId) payload.external_id = externalId;
    if (!Object.keys(payload).length) return;
    try {
      pixel.identify(payload);
    } catch (err) {
      /* nunca quebrar o checkout por causa de tracking */
    }
  }

  /**
   * Monta o bloco contents no formato que o TikTok espera.
   * @param {Array} items
   * @param {number} value total em reais
   */
  function contentsFrom(items, value) {
    var list = Array.isArray(items) ? items : [];
    var contents = list.map(function (item) {
      var nome = item.name || PRODUTO_PADRAO;
      var variacao = [item.color, item.size].filter(Boolean).join(" ");
      return {
        content_id: String(item.id || slug(nome + "-" + variacao) || "produto"),
        content_type: "product",
        content_name: variacao ? nome + " - " + variacao : nome,
        quantity: Number(item.qty || item.quantity || 1),
        price: Number(item.price || 0),
      };
    });
    if (!contents.length) {
      contents = [
        {
          content_id: "tapetes-automotivos-sob-medida",
          content_type: "product",
          content_name: PRODUTO_PADRAO,
          quantity: 1,
          price: Number(value || 0),
        },
      ];
    }
    return {
      contents: contents,
      value: Number(value || 0),
      currency: CURRENCY,
    };
  }

  /**
   * @param {string} event nome padrão do TikTok
   * @param {object} [payload]
   * @param {string} [eventId] mesmo id enviado pela Events API (deduplicação)
   */
  function track(event, payload, eventId) {
    var pixel = ttq();
    if (!pixel) return;
    try {
      if (eventId) pixel.track(event, payload || {}, { event_id: String(eventId) });
      else pixel.track(event, payload || {});
    } catch (err) {
      /* idem */
    }
  }

  /** Mesmo formato usado no servidor (lib/tiktok-events.js). */
  function eventId(event, transactionId) {
    if (!transactionId) return "";
    return event + "." + transactionId;
  }

  var TTCLID_KEY = "tapecar-ttclid-v1";

  /** ttclid chega na URL do anúncio e precisa sobreviver até o pagamento. */
  function readTtclid() {
    try {
      var fromUrl = new URLSearchParams(global.location.search).get("ttclid");
      if (fromUrl) {
        sessionStorage.setItem(TTCLID_KEY, fromUrl);
        return fromUrl;
      }
      return sessionStorage.getItem(TTCLID_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  /** _ttp é o cookie que o próprio pixel grava no navegador. */
  function readTtp() {
    try {
      var match = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    } catch (err) {
      return "";
    }
  }

  /**
   * Contexto que o servidor precisa para atribuir a conversão.
   * Vai junto no POST /api/payment/create.
   */
  function context() {
    return {
      ttclid: readTtclid(),
      ttp: readTtp(),
      url: global.location.href,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent || "",
    };
  }

  // captura o ttclid logo na chegada, antes de qualquer navegação
  readTtclid();

  global.GdcTikTok = {
    track: track,
    identify: identify,
    contentsFrom: contentsFrom,
    normalizeEmail: normalizeEmail,
    normalizePhone: normalizePhone,
    eventId: eventId,
    context: context,
  };
})(window);
