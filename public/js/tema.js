/* =========================================================
   TAPECAR — motor de tema
   Ordem de decisao: ?tema= na URL > escolha salva > padrao.
   O padrao passou a ser vermelho, que e a cor da LP nova. Ambar e verde
   continuam disponiveis por ?tema=ambar / ?tema=verde.
   A chave do storage foi para _v2 de proposito: quem tinha 'ambar' salvo
   de um preview antigo nao carrega a cor velha para dentro do checkout.
   Carregado no <head> para nao piscar a cor errada.
   Vale para a LP, o checkout, o pix e o obrigado.
========================================================= */
(function () {
  "use strict";
  var CHAVE  = "tapecar_tema_v2";
  var VALIDOS = { vermelho: 1, ambar: 1, verde: 1 };
  var PADRAO = "vermelho";

  function daUrl() {
    var m = /[?&]tema=([a-z]+)/i.exec(location.search);
    return m && VALIDOS[m[1].toLowerCase()] ? m[1].toLowerCase() : null;
  }
  function salvo() {
    try { var t = localStorage.getItem(CHAVE); return VALIDOS[t] ? t : null; }
    catch (e) { return null; }
  }

  function aplicar(tema) {
    document.documentElement.setAttribute("data-tema", tema);
    try { localStorage.setItem(CHAVE, tema); } catch (e) {}
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", function () { trocarImagens(tema); });
    else trocarImagens(tema);
  }

  /* imagens que tem versao por tema trazem data-tema-ambar e data-tema-verde */
  function trocarImagens(tema) {
    var imgs = document.querySelectorAll("[data-tema-" + tema + "]");
    for (var i = 0; i < imgs.length; i++) {
      var novo = imgs[i].getAttribute("data-tema-" + tema);
      if (novo && imgs[i].getAttribute("src") !== novo) imgs[i].setAttribute("src", novo);
    }
  }

  /* links internos preservam o tema, para o preview nao se perder no checkout */
  function propagar(tema) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (!/\.html($|[?#])/.test(href) || /^https?:/i.test(href)) return;
      if (/[?&]tema=/.test(href)) return;
      a.setAttribute("href", href + (href.indexOf("?") >= 0 ? "&" : "?") + "tema=" + tema);
    }, true);
  }

  var tema = daUrl() || salvo() || PADRAO;
  aplicar(tema);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { propagar(tema); });
  else propagar(tema);

  window.trocarTema = function (t) { if (VALIDOS[t]) aplicar(t); };
})();
