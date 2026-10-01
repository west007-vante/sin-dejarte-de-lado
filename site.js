(() => {
  /* ---- telemetría: un punto único. Sin backend solo apila; cero red. (contrato: ../GANCHOS.md) ---- */
  window.__farol_fila = window.__farol_fila || [];
  if (typeof window.farol !== "function") {
    window.farol = (evento, extra) => { window.__farol_fila.push({ evento, extra: extra || null, t: Date.now() }); };
  }
  const farol = (evento, extra) => { try { window.farol(evento, extra); } catch (e) {} };

  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => document.getElementById(id);

  /* ---- checkout: mientras el href sea el marcador, el botón no finge que funciona ---- */
  [["comprar-precio", "aviso-precio", "precio"], ["comprar-final", "aviso-final", "final"]].forEach(([idB, idA, lugar]) => {
    const b = $(idB), a = $(idA);
    if (!b) return;
    const falta = (b.getAttribute("href") || "").indexOf("STRIPE_LINK") !== -1;
    if (falta) { b.setAttribute("aria-disabled", "true"); b.setAttribute("role", "button"); }
    else if (a) a.remove();
    b.addEventListener("click", ev => { if (falta) ev.preventDefault(); farol("clic_comprar", { lugar }); });
  });

  /* ---- primer estadio: rueda hasta las páginas, NO va al checkout ---- */
  const paginas = $("paginas");
  const irAPaginas = e => { e.preventDefault(); paginas.scrollIntoView({ behavior: calmo ? "auto" : "smooth", block: "start" }); };
  $("ver-paginas").addEventListener("click", e => { farol("clic_ver_paginas"); irAPaginas(e); });
  document.querySelectorAll('a[href="#paginas"]:not(#ver-paginas)').forEach(a => a.addEventListener("click", irAPaginas));

  /* ---- carrusel de las páginas ---- */
  const visor = $("carro"), hojas = [...visor.querySelectorAll(".hoja")], cuenta = $("cuenta");
  const plantilla = cuenta.dataset.plantilla;
  let actual = 0, destino = null, suelta = 0;
  const marcar = n => {
    if (n === actual) return;
    actual = n;
    hojas.forEach((h, i) => { h.classList.toggle("es-actual", i === n); h.setAttribute("aria-current", i === n ? "true" : "false"); });
    cuenta.textContent = plantilla.replace("{n}", n + 1).replace("{t}", hojas.length);
    farol("carrusel", { pagina: n + 1 });
  };
  const centro = h => h.offsetLeft + h.offsetWidth / 2;
  const masCerca = () => {
    const c = visor.scrollLeft + visor.clientWidth / 2;
    let mejor = 0, d = Infinity;
    hojas.forEach((h, i) => { const k = Math.abs(centro(h) - c); if (k < d) { d = k; mejor = i; } });
    return mejor;
  };
  const ir = n => {
    n = (n + hojas.length) % hojas.length;   // da la vuelta: ningún clic queda sin efecto
    destino = n;
    clearTimeout(suelta);
    suelta = setTimeout(() => { destino = null; }, 900);
    marcar(n);
    visor.scrollTo({ left: centro(hojas[n]) - visor.clientWidth / 2, behavior: calmo ? "auto" : "smooth" });
  };
  $("ant").addEventListener("click", () => ir(actual - 1));
  $("sig").addEventListener("click", () => ir(actual + 1));
  let espera = false;
  visor.addEventListener("scroll", () => {
    if (espera) return;
    espera = true;
    requestAnimationFrame(() => {
      espera = false;
      const n = masCerca();
      if (destino !== null) { if (n === destino) destino = null; return; }
      marcar(n);
    });
  }, { passive: true });

  /* ---- marcos de lectura: 25 · 50 · 75 · 100, una vez cada uno ---- */
  const hechos = {};
  addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? (scrollY / max) * 100 : 100;
    [25, 50, 75, 100].forEach(m => {
      if (!hechos[m] && p >= (m === 100 ? 99 : m)) { hechos[m] = true; farol("scroll_" + m); }
    });
  }, { passive: true });

  /* ---- las cuatro columnas: renglones con trazo de bolígrafo (SVG hecho a mano, sin texto falso) ---- */
  const azar = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const garabato = (fin, r) => {
    const palabras = [];
    let x = 3;
    while (x < fin - 16) {
      const letras = 2 + Math.floor(r() * 6);
      let d = `M${x.toFixed(1)} 23`;
      for (let i = 0; i < letras && x < fin - 8; i++) {
        const w = 5 + r() * 4.5, k = r();
        const alto = k > .84 ? 13 + r() * 4 : k < .1 ? -(5 + r() * 3) : 3.5 + r() * 4.5;
        d += `q${(w * .32).toFixed(1)} ${(-alto).toFixed(1)} ${(w * .62).toFixed(1)} ${(-alto * .12).toFixed(1)}`;
        d += `q${(w * .2).toFixed(1)} ${(alto * .2).toFixed(1)} ${(w * .38).toFixed(1)} ${(alto * .12).toFixed(1)}`;
        x += w;
      }
      palabras.push(`<path d="${d}"/>`);
      x += 8 + r() * 7;
    }
    return palabras.join("");
  };
  document.querySelectorAll(".col").forEach((col, c) => {
    const r = azar(97 + c * 131);
    col.querySelectorAll(".renglon").forEach((ren, i, todos) => {
      const fin = i === todos.length - 1 ? 90 + r() * 70 : 200 + r() * 36;
      ren.innerHTML = `<svg viewBox="0 0 240 34" preserveAspectRatio="none" aria-hidden="true">${garabato(fin, r)}</svg>`;
    });
  });

  /* ---- qué es: cada palabra en su span, sin tocar los <strong> ---- */
  document.querySelectorAll("[data-palabras]").forEach(el => {
    const nodos = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) nodos.push(tw.currentNode);
    nodos.forEach(n => {
      const f = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(" ")); return; }
        const s = document.createElement("span");
        s.className = "w"; s.textContent = t; f.appendChild(s);
      });
      n.parentNode.replaceChild(f, n);
    });
  });

  if (calmo || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* una sola curva en todo el sitio: la misma cubic-bezier(.22,.8,.2,1) del CSS */
  const curva = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return p => {
      let t = p;
      for (let i = 0; i < 6; i++) {
        const e = ((ax * t + bx) * t + cx) * t - p, k = (3 * ax * t + 2 * bx) * t + cx;
        if (Math.abs(e) < 1e-5 || !k) break;
        t -= e / k;
      }
      return ((ay * t + by) * t + cy) * t;
    };
  };
  gsap.registerEase("casa", curva(.22, .8, .2, 1));
  gsap.defaults({ ease: "casa", duration: 1.1 });

  /* rolagem suave */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const entra = (alvos, extra) => gsap.utils.toArray(alvos).forEach(el => {
    gsap.from(el, Object.assign({ opacity: 0, y: 26, scrollTrigger: { trigger: el, start: "top 90%", once: true } }, extra || {}));
  });
  /* título que sube por detrás de una máscara */
  const sube = alvos => gsap.utils.toArray(alvos).forEach(el => {
    gsap.fromTo(el, { yPercent: 30, opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
      { yPercent: 0, opacity: 1, clipPath: "inset(0% 0% -20% 0%)", duration: 1.3, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });
  const dibuja = (p, st) => {
    const largo = Math.ceil(p.getTotalLength()) + 1;
    gsap.set(p, { strokeDasharray: largo, strokeDashoffset: largo });
    return gsap.to(p, Object.assign({ strokeDashoffset: 0 }, st));
  };

  const mm = gsap.matchMedia();
  mm.add({ ancho: "(min-width: 900px)", estrecho: "(max-width: 899px)" }, ctx => {
    const { ancho } = ctx.conditions;

    /* 0 · la línea de margen se escribe con la lectura */
    gsap.to(".margen i", { scaleY: 1, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 } });

    /* 1 · la portada se endereza y sube al salir de la dobla */
    gsap.fromTo(".capa-hoja", { rotate: -2.2, yPercent: 0 }, {
      rotate: 0.6, yPercent: ancho ? -14 : -6, ease: "none",
      scrollTrigger: { trigger: "#dobra", start: "top top", end: "bottom top", scrub: 0.5 }
    });

    /* 2 · qué es: las tres líneas se llenan palabra por palabra */
    sube("#que-es .nota-margen");
    gsap.fromTo("#que-es .w", { opacity: 0.2 }, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: "#que-es .lineas", start: "top 84%", end: "bottom 58%", scrub: 0.4 }
    });

    /* 3 · las tres páginas llegan apiladas y se reparten sobre la mesa */
    sube("#paginas .titulo");
    entra("#paginas .peq, .hoja-mando");
    gsap.fromTo(".hoja-papel", {
      rotate: i => [-5, 3.5, -2.5][i % 3], xPercent: i => -i * (ancho ? 62 : 40), y: 70
    }, {
      rotate: 0, xPercent: 0, y: 0, ease: "none",
      scrollTrigger: { trigger: "#carro", start: "top 96%", end: "top 30%", scrub: 0.5 }
    });

    /* 4 · índice: cada renglón se raya y se escribe; a la izquierda, la etapa por la que vas */
    sube("#indice .titulo");
    entra("#indice .peq");
    const filas = gsap.utils.toArray(".modulo");
    filas.forEach(f => {
      const st = { trigger: f, start: "top 92%", once: true };
      gsap.from(f.querySelector(".raya"), { scaleX: 0, duration: 1.3, scrollTrigger: st });
      gsap.from(f.querySelectorAll(".modulo-n, .modulo-t, .modulo-e"), { opacity: 0, y: 16, stagger: 0.06, scrollTrigger: st });
    });
    if (ancho) {
      const viva = document.createElement("p");
      viva.className = "etapa-viva"; viva.setAttribute("aria-hidden", "true");
      const palabra = document.createElement("span");
      palabra.textContent = filas[0].dataset.etapa;
      viva.appendChild(palabra);
      document.querySelector(".indice-fijo").appendChild(viva);
      filas.forEach(f => ScrollTrigger.create({
        trigger: f, start: "top 58%", end: "bottom 58%",
        onToggle: s => {
          if (!s.isActive || palabra.textContent === f.dataset.etapa) return;
          palabra.textContent = f.dataset.etapa;
          gsap.fromTo(palabra, { yPercent: 105 }, { yPercent: 0, duration: 0.7, overwrite: true });
        }
      }));
      ctx.add(() => () => viva.remove());
    }

    /* 5 · para quién: la raya del medio baja con la lectura */
    sube("#para-quien .titulo");
    if (ancho) gsap.fromTo(".dos-linea", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".dos", start: "top 80%", end: "bottom 62%", scrub: 0.4 } });
    entra(".dos h3");
    entra(".dos li", { y: 18 });

    /* 6 · las cuatro columnas se escriben con azul de bolígrafo, una después de otra */
    sube("#formato .titulo");
    entra("#formato .formato-p");
    const tc = gsap.timeline({
      scrollTrigger: ancho
        ? { trigger: ".formato-pin", start: "center center", end: "+=130%", pin: true, scrub: 0.6, anticipatePin: 1 }
        : { trigger: ".cuadro", start: "top 78%", end: "bottom 46%", scrub: 0.6 }
    });
    gsap.utils.toArray(".col").forEach((col, c) => {
      tc.fromTo(col.querySelectorAll(".col-t, .col-e"), { opacity: 0.25 }, { opacity: 1, duration: 0.3, ease: "none" }, c);
      const trazos = [...col.querySelectorAll(".renglon")].filter(r => r.offsetParent).flatMap(r => [...r.querySelectorAll("path")]);
      const largos = trazos.map(p => Math.ceil(p.getTotalLength()) + 1), total = largos.reduce((a, n) => a + n, 0);
      let t = c + 0.1;
      trazos.forEach((p, i) => {
        const dur = 0.9 * largos[i] / total;
        gsap.set(p, { strokeDasharray: largos[i], strokeDashoffset: largos[i] });
        tc.to(p, { strokeDashoffset: 0, duration: dur, ease: "none" }, t);
        t += dur;
      });
    });
    entra("#formato .formato-fin");

    /* 7 · lo que recibes */
    sube("#recibes .titulo");
    gsap.utils.toArray(".recibe").forEach(f => {
      const st = { trigger: f, start: "top 90%", once: true };
      gsap.from(f.querySelector(".raya"), { scaleX: 0, duration: 1.3, scrollTrigger: st });
      gsap.from(f.querySelector("p"), { opacity: 0, y: 18, scrollTrigger: st });
    });
    entra(".no-recibes .lista-t");
    entra(".no-recibes li", { y: 18 });

    /* 8 · precio: la cifra sube por detrás de la máscara */
    gsap.from(".precio-cifra > span", { yPercent: 108, duration: 1.4, scrollTrigger: { trigger: ".precio-cifra", start: "top 88%", once: true } });
    entra(".precio-l, .condiciones li, #precio .btn-nota");   /* el botón de compra y su aviso NO entran rodando: se ven desde la carga */

    /* 9 · política · 10 · preguntas */
    sube("#politica .titulo, #faq .titulo");
    entra(".politica-dos p, .legal, .faq");

    /* 11 · cierre: el panel abre por máscara y la frase se subraya otra vez */
    gsap.fromTo(".cierre", { clipPath: "inset(26% 0% 0% 0%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", ease: "none",
      scrollTrigger: { trigger: ".cierre", start: "top bottom", end: "top 34%", scrub: 0.4 }
    });
    dibuja(document.querySelector(".cierre .pluma path"), { duration: 1.2, scrollTrigger: { trigger: ".cierre .frase", start: "top 62%", once: true } });
    entra(".cierre-sub, .cierre .btn-nota");
  });

  document.querySelectorAll("details").forEach(d => d.addEventListener("toggle", () => ScrollTrigger.refresh()));
  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
