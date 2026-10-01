/*! farol.js — telemetria da oferta "Sin dejarte de lado". 01/10/2026. ~2,6 KB, sem framework.
 *
 * PONTO ÚNICO DE CHAMADA:  window.farol(evento, extra)
 *   Assinatura e nomes vêm do BRIEFING da página (sites/workbook-latam/BRIEFING.md §8).
 *   Este arquivo SUBSTITUI o esboço que só empilha em window.__farol_fila: ao carregar,
 *   ele esvazia essa fila e passa a mandar de verdade.
 *   Nomes do contrato da página      -> nome gravado no banco
 *     scroll_25/50/75/100            -> rolou_25/50/75/100
 *     carrusel                       -> carrossel
 *     clic_ver_paginas               -> ver_paginas        (1º estágio: NÃO é compra)
 *     clic_comprar                   -> comprar            <-- o único que vira aviso
 *     obrigado / gracias             -> obrigado
 *   `extra` ({pagina:n}, {lugar:'precio'|'final'}) é ACEITO e DESCARTADO: não vai ao
 *   banco nem ao aviso. Nome fora da lista é ignorado aqui mesmo.
 *
 * O QUE ELE LIGA SOZINHO (rede de segurança, caso a página não chame):
 *   entrou            ao carregar
 *   rolou_25/50/75/100 nos marcos de rolagem
 *   preco_viu         quando #precio entra na tela
 *   preco_ficou       quando #precio fica 8 s visível
 *   comprar           no clique em #comprar-precio / #comprar-final / href de checkout
 *   ver_paginas       no clique em #ver-paginas
 *   Tudo com travessão de repetição: um evento de cada por sessão de página, então
 *   a chamada da página e a rede de segurança NUNCA contam duas vezes.
 *
 * TRAVA DE PRIVACIDADE — o que ele manda, e só isso:
 *   { evento, idioma, sessao, utm_source, utm_medium, utm_campaign, teste }
 *   Nunca: resposta de exercício, campo de formulário, nome, e-mail, telefone,
 *   histórico de saúde ou de família, texto da página, URL, referrer, user-agent.
 *   O id de sessão é sorteado (crypto) e vive em sessionStorage: fecha a aba,
 *   acaba. Não é fingerprint e não atravessa domínio.
 */
(function () {
  "use strict";
  var FUNCAO = window.WB_FAROL_URL || "";              // url da Edge Function wb-farol
  var CHAVE  = window.WB_FAROL_ANON || "";             // anon key do projeto (pública por desenho)
  if (!FUNCAO) return;

  var OK = ["entrou","rolou_25","rolou_50","rolou_75","rolou_100",
            "carrossel","preco_viu","preco_ficou","comprar","obrigado"];

  var q = new URLSearchParams(location.search);
  // Modo teste: ?teste=1, ou a página rodando fora do ar (localhost/arquivo).
  var TESTE = q.get("teste") === "1" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
              || location.protocol === "file:";

  function sessao() {
    try {
      var s = sessionStorage.getItem("wb_s");
      if (s && /^[0-9a-f]{32}$/.test(s)) return s;
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      s = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      sessionStorage.setItem("wb_s", s); return s;
    } catch (e) {
      var b = new Uint8Array(16); crypto.getRandomValues(b);
      return Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    }
  }
  function idioma() {
    var d = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
    return d === "en" ? "en" : "es";
  }
  // utm só do charset seguro; o que não passa vira ausente (nunca vai sujo).
  function utm(n) { var v = q.get(n) || ""; return /^[A-Za-z0-9._-]{1,40}$/.test(v) ? v : undefined; }

  var FIXO = null;
  function base() {
    if (!FIXO) FIXO = { sessao: sessao(), idioma: idioma(), teste: TESTE,
                        utm_source: utm("utm_source"), utm_medium: utm("utm_medium"),
                        utm_campaign: utm("utm_campaign") };
    return FIXO;
  }

  var ja = {};
  // Assinatura do contrato: farol(evento, extra). `extra` é descartado de propósito.
  function mandar(ev, _extra) {
    if (typeof ev !== "string") return;
    ev = MAPA[ev] || ev;
    if (OK.indexOf(ev) < 0 || ja[ev]) return;        // um de cada por sessão de página
    ja[ev] = 1;
    var corpo = JSON.stringify(Object.assign({ evento: ev }, base()));
    var h = { "content-type": "application/json" };
    if (CHAVE) { h.apikey = CHAVE; h.authorization = "Bearer " + CHAVE; }
    try {
      // keepalive: o aviso de `comprar` sai mesmo com a aba indo para o checkout.
      fetch(FUNCAO, { method: "POST", headers: h, body: corpo, keepalive: true, mode: "cors" })
        .catch(function () {});
    } catch (e) {}
  }
  // Troca o esboço pelo farol de verdade e esvazia o que ele empilhou.
  var fila = window.__farol_fila;
  window.farol = mandar;
  if (Object.prototype.toString.call(fila) === "[object Array]") {
    for (var i = 0; i < fila.length; i++) {
      var it = fila[i];
      if (typeof it === "string") mandar(it);
      else if (it && typeof it.length === "number") mandar(it[0], it[1]);
      else if (it && it.evento) mandar(it.evento, it.extra);
    }
    try { window.__farol_fila = { push: function (x) { if (typeof x === "string") mandar(x); else if (x && x.length) mandar(x[0], x[1]); }, length: 0 }; } catch (e) {}
  }

  // ---- entrou -------------------------------------------------------------
  mandar("entrou");

  // ---- rolagem ------------------------------------------------------------
  var marcos = [[25,"rolou_25"],[50,"rolou_50"],[75,"rolou_75"],[100,"rolou_100"]], travado = false;
  function rolou() {
    if (travado) return; travado = true;
    requestAnimationFrame(function () {
      travado = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? ((window.scrollY || window.pageYOffset) / h) * 100 : 100;
      for (var i = 0; i < marcos.length; i++) if (p >= marcos[i][0] - 0.5) mandar(marcos[i][1]);
    });
  }
  addEventListener("scroll", rolou, { passive: true });
  addEventListener("load", rolou);

  // ---- bloco de preço: viu, e ficou 8 s -----------------------------------
  function olharPreco() {
    var alvo = document.getElementById("precio") || document.querySelector('[data-farol="preco"]') || document.getElementById("preco");
    if (!alvo || !("IntersectionObserver" in window)) return;
    var relogio = null;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          mandar("preco_viu");
          if (!relogio && !ja["preco_ficou"]) relogio = setTimeout(function () { mandar("preco_ficou"); }, 8000);
        } else if (relogio) { clearTimeout(relogio); relogio = null; }
      });
    }, { threshold: 0.4 }).observe(alvo);
  }

  // ---- carrossel e comprar ------------------------------------------------
  // Delegação no documento: funciona com conteúdo que aparece depois.
  addEventListener("click", function (e) {
    var c = e.target && e.target.closest ? e.target.closest(
      '#comprar-precio, #comprar-final, #ver-paginas, [data-farol]') : null;
    if (c) {
      if (c.id === "comprar-precio" || c.id === "comprar-final") { mandar("comprar"); return; }
      if (c.id === "ver-paginas") { mandar("ver_paginas"); return; }
      var k = c.getAttribute("data-farol");
      if (k) { mandar(k); return; }
    }
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (a && /hotmart\.com|pay\.hotmart|hotmart\.com\.br|pay\.cakto\.com\.br|checkout|\/comprar|buy\.stripe\.com/i.test(a.getAttribute("href") || "")) {
      mandar("comprar");
    }
  }, true);
  addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var t = document.activeElement;
    if (!t) return;
    if (t.id === "comprar-precio" || t.id === "comprar-final"
        || (t.getAttribute && t.getAttribute("data-farol") === "comprar")) mandar("comprar");
  }, true);

  if (document.readyState === "loading") addEventListener("DOMContentLoaded", olharPreco);
  else olharPreco();
})();
