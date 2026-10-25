/* Alugue Houses — filme promocional de 30 s.
 * Uma única timeline GSAP controla as oito cenas. Na prévia ela toca sozinha;
 * no modo de exportação (?render=1) fica pausada e o exportador chama
 * window.PROMO.seek(t) quadro a quadro.
 */
(() => {
  "use strict";

  const DURATION = 30;
  const FPS = 30;
  const params = new URLSearchParams(location.search);
  const RENDER = params.has("render");

  // Fotografias por posição no filme. Para trocar uma foto, substitua o
  // arquivo mantendo o nome (veja README → "Fotografias").
  const PHOTOS = {
    "mansao-piscina-infinita": "assets/fotos/campanha/mansao-piscina-infinita.jpg",
    "casa-vista-mar": "assets/fotos/campanha/casa-vista-mar.jpg",
    "mansao-area-gourmet": "assets/fotos/campanha/mansao-area-gourmet.jpg",
    "casa-praia-vegetacao": "assets/fotos/campanha/casa-praia-vegetacao.jpg",
    "piscina-entardecer": "assets/fotos/campanha/piscina-entardecer.jpg",
    "sala-contemporanea": "assets/fotos/campanha/sala-contemporanea.jpg",
    "varanda-vista-mar": "assets/fotos/campanha/varanda-vista-mar.jpg",
    "area-gourmet": "assets/fotos/campanha/area-gourmet.jpg",
    "fachada-jardim-tropical": "assets/fotos/campanha/fachada-jardim-tropical.jpg",
    // Fotos reais do Imóvel 01 (media/recebidas/imovel-01, uso autorizado).
    "imovel-01-sala": "assets/fotos/imovel-01/sala-jantar.jpg",
    "imovel-01-cozinha": "assets/fotos/imovel-01/cozinha.jpg",
    "imovel-01-quarto": "assets/fotos/imovel-01/quarto-beliche.jpg",
    "imovel-01-banheiro": "assets/fotos/imovel-01/banheiro.jpg",
  };

  // Pontos de sincronização para a trilha e os impactos sonoros (segundos).
  const CUES = [
    { t: 0.2, id: "abertura", note: "textura ambiente começa a subir" },
    { t: 1.25, id: "logo", note: "impacto suave: logo aparece" },
    { t: 3.45, id: "transicao-1", note: "varredura de luz" },
    { t: 4.5, id: "titulo-refugio", note: "piano: primeira frase" },
    { t: 8.0, id: "celular", note: "whoosh: iPhone entra girando" },
    { t: 11.4, id: "zoom-tela", note: "whoosh grave: câmera entra na tela" },
    { t: 12.8, id: "cards", note: "três toques leves: cards saltam" },
    { t: 18.5, id: "clique", note: "clique discreto no mapa" },
    { t: 20.0, id: "montagem", note: "batida: início da montagem" },
    { t: 24.2, id: "celulares", note: "impacto: três celulares" },
    { t: 27.5, id: "logo-final", note: "acorde final" },
    { t: 28.9, id: "brilho", note: "brilho percorre a logo" },
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  if (RENDER) document.body.classList.add("render");

  // ---------- encaixe do palco 1920 × 1080 na janela ----------
  const stage = $("#stage");
  function fit() {
    const k = RENDER ? 1 : Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `scale(${k})`;
  }
  addEventListener("resize", fit);
  fit();

  // ---------- celulares ----------
  for (const slot of $$(".phone-slot")) {
    const tpl = document.getElementById(slot.dataset.screen);
    slot.innerHTML = `
      <div class="phone">
        <div class="phone-body">
          <span class="phone-btn l1"></span><span class="phone-btn l2"></span>
          <span class="phone-btn l3"></span><span class="phone-btn r1"></span>
          <div class="phone-bezel"><div class="phone-screen"><div class="phone-island"></div></div></div>
        </div>
        <div class="phone-glare"></div>
      </div>`;
    $(".phone-screen", slot).appendChild(tpl.content.cloneNode(true));
  }

  // ---------- fotografias ----------
  function loadPhotos() {
    const imgs = $$("img[data-slot]");
    return Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            const src = PHOTOS[img.dataset.slot];
            const fail = () => {
              img.classList.add("missing");
              img.parentElement.classList.add("slot-missing");
              img.parentElement.dataset.missing = src.split("/").pop();
              resolve();
            };
            img.src = src;
            img.decode().then(resolve, fail);
          }),
      ),
    );
  }

  // ---------- partículas e grão (funções do tempo, para exportar quadro a quadro) ----------
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  const P = { alpha: 0 };
  const particles = (() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: 110 }, () => ({
      x: rnd() * 1920,
      y: rnd() * 1080,
      r: 0.6 + rnd() * 2.2,
      vx: (rnd() - 0.5) * 14,
      vy: 6 + rnd() * 18,
      ph: rnd() * Math.PI * 2,
      warm: rnd() > 0.6,
    }));
  })();

  function drawParticles(t) {
    ctx.clearRect(0, 0, 1920, 1080);
    if (P.alpha <= 0.001) return;
    for (const p of particles) {
      const x = (((p.x + p.vx * t) % 1920) + 1920) % 1920;
      const y = (((p.y - p.vy * t) % 1080) + 1080) % 1080;
      const tw = 0.45 + 0.55 * Math.sin(t * 1.7 + p.ph);
      const a = P.alpha * tw * 0.7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4);
      const c = p.warm ? "217,199,163" : "150,215,215";
      g.addColorStop(0, `rgba(${c},${a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const grain = $("#grain");
  const floats = [];
  function tick(t) {
    drawParticles(t);
    const f = Math.floor(t * 24);
    const gx = ((f * 73) % 100) - 50;
    const gy = ((f * 37) % 100) - 50;
    grain.style.transform = `translate(${gx}px, ${gy}px)`;
    for (const fl of floats) {
      gsap.set(fl.el, {
        y: Math.sin(t * fl.speed + fl.phase) * fl.amp,
        rotationZ: Math.sin(t * fl.speed * 0.7 + fl.phase) * fl.rot,
      });
    }
  }

  // ---------- auxiliares de texto ----------
  function words(el) {
    return SplitText.create(el, { type: "words", wordsClass: "word" }).words;
  }
  function chars(el) {
    return SplitText.create(el, { type: "words,chars", charsClass: "char" }).chars;
  }
  function wordsIn(tl, el, at, opts = {}) {
    const w = words(el);
    tl.fromTo(
      w,
      { opacity: 0, y: 56, rotationX: -55, filter: "blur(10px)", transformPerspective: 800, transformOrigin: "50% 100%" },
      { opacity: 1, y: 0, rotationX: 0, filter: "blur(0px)", duration: 1, stagger: opts.stagger ?? 0.09, ease: "expo.out" },
      at,
    );
    return w;
  }
  function wordsOut(tl, w, at) {
    tl.to(w, { opacity: 0, y: -28, filter: "blur(10px)", duration: 0.5, stagger: 0.03, ease: "power2.in" }, at);
  }
  function show(tl, sel, at, dur = 0.5) {
    tl.fromTo(sel, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur, ease: "power2.out" }, at);
  }
  function hide(tl, sel, at) {
    tl.set(sel, { autoAlpha: 0 }, at);
  }

  // ---------- timeline mestre ----------
  function build() {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    tl.to({}, { duration: DURATION }, 0);

    tl.fromTo("#blackout", { opacity: 1 }, { opacity: 0, duration: 1.3, ease: "power2.inOut" }, 0.05);
    tl.fromTo(P, { alpha: 0 }, { alpha: 1, duration: 1.8, ease: "sine.inOut" }, 0.5);

    // CENA 1 — 00:00–00:04
    tl.set("#s1", { autoAlpha: 1 }, 0);
    tl.fromTo("#s1 .volume", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 2.4, ease: "power2.out" }, 0.2);
    tl.fromTo("#s1 .rays", { opacity: 0, rotation: -4 }, { opacity: 1, rotation: 4, duration: 3.4, ease: "sine.inOut" }, 0.5);
    tl.fromTo("#s1 .streaks", { opacity: 0, xPercent: -4 }, { opacity: 1, xPercent: 4, duration: 3.4, ease: "none" }, 0.4);
    tl.fromTo("#s1 .halo", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 1.9, ease: "power2.out" }, 0.95);
    tl.fromTo(
      "#s1 .logo-holder",
      { opacity: 0, scale: 0.82, z: -320, rotationX: 16, filter: "blur(14px)" },
      { opacity: 1, scale: 1, z: 0, rotationX: 0, filter: "blur(0px)", duration: 1.7, ease: "expo.out" },
      1.25,
    );
    tl.fromTo("#s1 .logo-shine", { backgroundPosition: "120% 0" }, { backgroundPosition: "-20% 0", duration: 1.2, ease: "power2.inOut" }, 2.1);
    tl.fromTo(
      chars($("#s1 .brand-line")),
      { opacity: 0, y: 18, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.016, ease: "power2.out" },
      2.3,
    );
    tl.fromTo("#s1 .cam", { scale: 1 }, { scale: 1.06, duration: 3.45, ease: "none" }, 0);
    tl.fromTo("#s1 .sweep", { xPercent: -60 }, { xPercent: 60, duration: 0.9, ease: "power2.inOut" }, 3.3);
    tl.to("#s1 .cam", { scale: 1.24, opacity: 0, filter: "blur(18px)", duration: 0.7, ease: "power2.in" }, 3.45);
    hide(tl, "#s1", 4.2);

    // CENA 2 — 00:04–00:08
    show(tl, "#s2", 3.7, 0.6);
    tl.fromTo("#s2 .photo-frame", { filter: "blur(24px)" }, { filter: "blur(0px)", duration: 0.9, ease: "power2.out" }, 3.7);
    tl.fromTo("#s2 .photo", { scale: 1.2, xPercent: -2 }, { scale: 1.07, xPercent: 1, duration: 3.6, ease: "none" }, 3.7);
    tl.fromTo("#s2 .photo", { filter: "brightness(0.78) saturate(0.95)" }, { filter: "brightness(1.04) saturate(1.05)", duration: 2.6, ease: "sine.inOut" }, 3.7);
    tl.fromTo("#s2 .grade-bottom", { opacity: 0 }, { opacity: 1, duration: 1, ease: "power2.out" }, 4.2);
    const w2 = wordsIn(tl, $(".s2-title"), 4.5);
    wordsOut(tl, w2, 7.2);
    tl.to("#s2 .photo", { scale: 1.95, duration: 1, ease: "power3.in" }, 7.3);
    tl.to("#s2 .photo-frame", { filter: "blur(16px)", duration: 0.6, ease: "power2.in" }, 7.65);
    tl.to("#s2", { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, 7.85);

    // CENA 3 — 00:08–00:12
    show(tl, "#s3", 7.9, 0.6);
    tl.fromTo(".a1, .a2", { opacity: 0 }, { opacity: 1, duration: 1.5, ease: "sine.inOut" }, 7.9);
    tl.fromTo(P, { alpha: 1 }, { alpha: 0.7, duration: 0.5 }, 3.7);
    tl.fromTo("#s3 .spot", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.8, ease: "power2.out" }, 7.95);
    tl.fromTo(
      "#phoneA",
      { rotationY: -48, rotationX: 14, rotationZ: -6, y: 160, z: -520, opacity: 0 },
      { rotationY: 0, rotationX: 0, rotationZ: 0, y: 0, z: 0, opacity: 1, duration: 2.1, ease: "expo.out" },
      8.0,
    );
    tl.fromTo("#phoneA .phone-glare", { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 1.8, ease: "power2.inOut" }, 8.3);
    tl.fromTo($$("#phoneA .r"), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }, 8.7);
    tl.fromTo(chars($("#phoneA .typed")), { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 0.035, ease: "none" }, 9.5);
    tl.fromTo("#s3 .kicker", { opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.28em", duration: 1.2, ease: "expo.out" }, 8.7);
    const w3 = wordsIn(tl, $("#s3 .headline"), 8.9);
    tl.fromTo("#s3 .support", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9 }, 9.7);
    wordsOut(tl, w3, 11.25);
    tl.to("#s3 .kicker, #s3 .support", { opacity: 0, x: -40, duration: 0.5, ease: "power2.in" }, 11.25);
    tl.to("#phoneA", { x: -435, y: -60, scale: 3.4, duration: 0.9, ease: "power3.in" }, 11.35);
    tl.to("#phoneA", { filter: "blur(12px)", opacity: 0, duration: 0.35, ease: "power2.in" }, 11.9);
    tl.to("#s3 .spot", { opacity: 0, duration: 0.6 }, 11.5);
    hide(tl, "#s3", 12.3);

    // CENA 4 — 00:12–00:16
    show(tl, "#s4", 12.0, 0.3);
    tl.fromTo("#phoneB", { scale: 2.6, filter: "blur(14px)" }, { scale: 0.92, filter: "blur(0px)", duration: 1.0, ease: "expo.out" }, 12.0);
    tl.fromTo($$("#phoneB .r"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, 12.2);
    const cards = $$(".pcard");
    const fan = [
      { x: -540, y: 40, z: 120, rotationY: 24, rotationZ: -3, scale: 1 },
      { x: 0, y: 0, z: 260, rotationY: 0, rotationZ: 0, scale: 1.04 },
      { x: 540, y: 40, z: 120, rotationY: -24, rotationZ: 3, scale: 1 },
    ];
    const row = [
      { x: -500, y: 60, z: 0, rotationY: 9, rotationZ: 0, scale: 0.96 },
      { x: 0, y: 40, z: 60, rotationY: 0, rotationZ: 0, scale: 1 },
      { x: 500, y: 60, z: 0, rotationY: -9, rotationZ: 0, scale: 0.96 },
    ];
    cards.forEach((card, i) => {
      const at = 12.85 + i * 0.13;
      tl.fromTo(card, { x: 0, y: 30, z: -40, scale: 0.5, rotationY: 0, rotationZ: 0, opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none" }, at);
      tl.to(card, { ...fan[i], duration: 1.25, ease: "expo.out" }, at);
      tl.to(card, { ...row[i], duration: 1.0, ease: "power3.inOut" }, 14.45 + i * 0.05);
      tl.to(card, { y: "-=14", duration: 0.6, ease: "sine.inOut" }, 15.0);
      tl.to(card, { y: "-=90", z: -260, opacity: 0, filter: "blur(12px)", duration: 0.55, ease: "power2.in" }, 15.55 + i * 0.06);
    });
    tl.to("#phoneB", { z: -420, opacity: 0, duration: 1.2, ease: "power2.inOut" }, 13.05);
    const w4 = wordsIn(tl, $(".s4-title"), 13.0, { stagger: 0.07 });
    wordsOut(tl, w4, 15.45);
    hide(tl, "#s4", 16.25);

    // CENA 5 — 00:16–00:20
    show(tl, "#s5", 16.0, 0.5);
    tl.fromTo("#s5 .map", { scale: 1.12 }, { scale: 1, duration: 4, ease: "power1.out" }, 16.0);
    const coast = $("#s5 .coast");
    const len = coast.getTotalLength();
    tl.fromTo(coast, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, 16.1);
    tl.fromTo("#s5 .land", { opacity: 0 }, { opacity: 1, duration: 1, ease: "power2.out" }, 16.1);
    tl.fromTo("#s5 .map-label", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, 16.8);
    tl.fromTo("#s5 .marker", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.06, ease: "back.out(2.4)" }, 17.0);
    wordsIn(tl, $(".s5-title"), 16.3, { stagger: 0.07 });
    tl.fromTo(".search-panel", { opacity: 0, x: -70, rotationY: 14, transformPerspective: 1400 }, { opacity: 1, x: 0, rotationY: 0, duration: 1.1, ease: "expo.out" }, 16.4);
    tl.fromTo(
      [".sp-tabs", ".sp-field.f1", ".sp-row", ".sp-field.f4", ".sp-chips", ".sp-button"],
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.55, stagger: 0.14 },
      16.7,
    );
    $$(".chip")
      .slice(0, 2)
      .forEach((chip, i) => {
        tl.to(chip, { backgroundColor: "#DCEBEC", borderColor: "#13606E", color: "#13606E", duration: 0.25, ease: "power1.out" }, 17.55 + i * 0.22);
        tl.fromTo(chip, { scale: 1 }, { scale: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" }, 17.55 + i * 0.22);
      });
    const target = $("#s5 .marker.active-target");
    const tx = parseFloat(target.style.left);
    const ty = parseFloat(target.style.top);
    tl.fromTo("#s5 .cursor", { x: 1300, y: 1010, opacity: 0 }, { opacity: 1, duration: 0.25 }, 17.7);
    tl.to("#s5 .cursor", { x: tx - 6, y: ty - 4, duration: 0.75, ease: "power2.inOut" }, 17.75);
    tl.to("#s5 .cursor", { scale: 0.82, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.inOut" }, 18.5);
    tl.fromTo("#s5 .ripple", { scale: 0.2, opacity: 1 }, { scale: 2.2, opacity: 0, duration: 0.6, ease: "power2.out" }, 18.52);
    tl.to(target, { scale: 1.35, duration: 0.3, ease: "back.out(3)" }, 18.52);
    tl.fromTo(
      "#s5 .detail-card",
      { opacity: 0, scale: 0.6, y: 40 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.4)" },
      18.65,
    );
    tl.to("#s5 .cursor", { x: "+=160", y: "+=60", opacity: 0, duration: 0.5, ease: "power2.in" }, 19.0);
    tl.to("#s5", { autoAlpha: 0, scale: 1.04, filter: "blur(14px)", duration: 0.6, ease: "power2.in" }, 19.55);
    tl.to(".a1, .a2", { opacity: 0, duration: 0.6 }, 19.6);

    // CENA 6 — 00:20–00:24
    show(tl, "#s6", 19.9, 0.4);
    tl.to(P, { alpha: 0.4, duration: 0.6 }, 19.9);
    const shots = $$("#s6 .shot");
    const starts = [19.95, 20.75, 21.55, 22.35, 23.15];
    shots.forEach((shot, i) => {
      const at = starts[i];
      const dir = i % 2 ? -1 : 1;
      const img = $("img", shot);
      if (i === 1 || i === 3) {
        tl.fromTo(
          shot,
          { opacity: 1, clipPath: dir > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)", filter: "blur(8px)" },
          { clipPath: "inset(0% 0% 0% 0%)", filter: "blur(0px)", duration: 0.6, ease: "power3.inOut" },
          at,
        );
      } else {
        tl.fromTo(
          shot,
          { opacity: 0, x: dir * 140, scaleX: 1.06, filter: "blur(18px)" },
          { opacity: 1, x: 0, scaleX: 1, filter: "blur(0px)", duration: 0.55, ease: "power2.out" },
          at,
        );
      }
      tl.fromTo(img, { scale: 1.16, xPercent: dir * -1.5 }, { scale: 1.04, xPercent: dir * 1.5, duration: 1.4, ease: "none" }, at);
      if (i < shots.length - 1) {
        tl.to(shot, { x: -dir * 70, filter: "blur(10px)", duration: 0.5, ease: "power2.in" }, starts[i + 1] - 0.05);
      }
    });
    tl.fromTo("#s6 .grade-bottom", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 20.1);
    const w6a = wordsIn(tl, $(".s6-a"), 20.25);
    wordsOut(tl, w6a, 21.6);
    wordsIn(tl, $(".s6-b"), 22.05);
    tl.to("#s6", { autoAlpha: 0, filter: "blur(16px)", scale: 1.04, duration: 0.55, ease: "power2.in" }, 23.85);

    // CENA 7 — 00:24–00:27
    show(tl, "#s7", 24.0, 0.4);
    tl.to(P, { alpha: 0.9, duration: 1 }, 24.0);
    tl.fromTo(".a1, .a2", { opacity: 0 }, { opacity: 0.8, duration: 1.2 }, 24.0);
    tl.fromTo("#s7 .s7-light", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1.1, duration: 2.8, ease: "power2.out" }, 24.1);
    tl.fromTo(
      "#phoneC",
      { y: 320, z: -600, rotationX: 22, opacity: 0 },
      { y: 0, z: 60, rotationX: 0, opacity: 1, duration: 1.4, ease: "expo.out" },
      24.2,
    );
    tl.fromTo(
      "#phoneL",
      { x: 0, y: 120, z: -400, rotationY: 0, rotationZ: 0, opacity: 0 },
      { x: -440, y: 50, z: -240, rotationY: 30, rotationZ: -7, opacity: 1, duration: 1.5, ease: "expo.out" },
      24.38,
    );
    tl.fromTo(
      "#phoneR",
      { x: 0, y: 120, z: -400, rotationY: 0, rotationZ: 0, opacity: 0 },
      { x: 440, y: 50, z: -240, rotationY: -30, rotationZ: 7, opacity: 1, duration: 1.5, ease: "expo.out" },
      24.38,
    );
    tl.fromTo("#s7 .phone-glare", { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 1.8, stagger: 0.1, ease: "power2.inOut" }, 24.8);
    tl.fromTo("#s7 .s7-space", { rotationY: -4 }, { rotationY: 4, duration: 3, ease: "sine.inOut" }, 24.2);

    // CENA 8 — 00:27–00:30
    tl.to(["#phoneL", "#phoneR", "#phoneC"], { z: -1700, opacity: 0, filter: "blur(8px)", duration: 0.75, stagger: 0.05, ease: "power2.in" }, 27.0);
    tl.to("#s7 .s7-light", { opacity: 0, duration: 0.6 }, 27.1);
    hide(tl, "#s7", 27.9);
    show(tl, "#s8", 27.2, 0.3);
    tl.fromTo("#s8 .volume", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out" }, 27.2);
    tl.fromTo("#s8 .halo", { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 1.3, ease: "power2.out" }, 27.3);
    tl.fromTo(
      "#s8 .logo-holder",
      { opacity: 0, scale: 0.9, y: 24, filter: "blur(12px)" },
      { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "expo.out" },
      27.5,
    );
    tl.fromTo(words($("#s8 .end-tag")), { opacity: 0, y: 18, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, stagger: 0.05 }, 28.05);
    tl.fromTo("#s8 .end-cta", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, 28.6);
    tl.fromTo("#s8 .fineprint", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 28.8);
    tl.fromTo("#s8 .logo-shine", { backgroundPosition: "120% 0" }, { backgroundPosition: "-20% 0", duration: 0.9, ease: "power2.inOut" }, 28.9);
    tl.to(P, { alpha: 0.25, duration: 0.8, ease: "sine.inOut" }, 29.2);
    tl.to(".a1, .a2", { opacity: 0.3, duration: 0.8 }, 29.2);

    // flutuação contínua dos celulares (função do tempo, sem tweens soltos)
    for (const [sel, amp, speed, phase, rot] of [
      ["#phoneA .phone", 9, 1.4, 0, 0.6],
      ["#phoneB .phone", 6, 1.6, 1, 0.4],
      ["#phoneC .phone", 10, 1.3, 0.3, 0.5],
      ["#phoneL .phone", 8, 1.5, 2.1, 0.5],
      ["#phoneR .phone", 8, 1.45, 4.0, 0.5],
    ]) {
      floats.push({ el: $(sel), amp, speed, phase, rot });
    }

    tl.eventCallback("onUpdate", () => tick(tl.time()));
    return tl;
  }

  // ---------- início ----------
  // A timeline vai embrulhada num objeto: timelines GSAP têm .then() e a
  // Promise esperaria o fim do filme em vez de resolver na hora.
  const ready = Promise.all([document.fonts.ready, loadPhotos()]).then(() => {
    gsap.registerPlugin(SplitText, CustomEase);
    const tl = build();
    tl.seek(0);
    tick(0);
    return { tl };
  });

  window.PROMO = {
    duration: DURATION,
    fps: FPS,
    cues: CUES,
    photos: PHOTOS,
    ready: ready.then(() => true),
    missingPhotos: () => $$("img.missing").map((i) => PHOTOS[i.dataset.slot]).filter((v, i, a) => a.indexOf(v) === i),
    async seek(t) {
      const { tl } = await ready;
      tl.seek(Math.min(t, DURATION), false);
      tick(tl.time());
      await new Promise((r) => requestAnimationFrame(() => r()));
    },
  };

  if (RENDER) return;

  // ---------- prévia: reprodução automática, controles discretos e trilha opcional ----------
  ready.then(({ tl }) => {
    const controls = $("#controls");
    controls.hidden = false;
    const range = $("input", controls);
    const out = $("output", controls);
    const toggle = $('[data-act="toggle"]', controls);
    const audio = new Audio("assets/audio/trilha.mp3");
    let hasAudio = false;
    audio.addEventListener("canplaythrough", () => (hasAudio = true), { once: true });
    audio.addEventListener("error", () => (hasAudio = false));
    audio.preload = "auto";

    const syncAudio = () => {
      if (!hasAudio) return;
      audio.currentTime = tl.time();
      tl.paused() ? audio.pause() : audio.play().catch(() => {});
    };
    gsap.ticker.add(() => {
      range.value = tl.time().toFixed(2);
      out.textContent = tl.time().toFixed(2).padStart(5, "0");
      toggle.textContent = tl.paused() || tl.progress() === 1 ? "▶" : "❚❚";
    });
    controls.addEventListener("click", (e) => {
      const act = e.target.closest("button")?.dataset.act;
      if (act === "replay") tl.restart();
      if (act === "toggle") {
        if (tl.progress() === 1) tl.restart();
        else tl.paused(!tl.paused());
      }
      syncAudio();
    });
    range.addEventListener("input", () => {
      tl.pause();
      tl.seek(parseFloat(range.value));
      syncAudio();
    });
    addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        tl.paused(!tl.paused());
        syncAudio();
      }
    });
    const missing = window.PROMO.missingPhotos();
    if (missing.length) console.warn("Fotos pendentes:", missing);
    tl.play(0);
    syncAudio();
  });
})();
