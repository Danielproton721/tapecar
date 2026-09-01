document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     1) MENU / DRAWER
  ========================================================= */
  const menuBtn = document.getElementById("menuBtn");
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const closeBtn = document.getElementById("drawerClose");

  if (menuBtn && drawer) {
    const openDrawer = () => {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      menuBtn.setAttribute("aria-expanded", "true");
      document.documentElement.style.overflow = "hidden";
    };

    const closeDrawer = () => {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      menuBtn.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
    };

    menuBtn.addEventListener("click", () => {
      drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
    });

    backdrop && backdrop.addEventListener("click", closeDrawer);
    closeBtn && closeBtn.addEventListener("click", closeDrawer);

    drawer.addEventListener("click", (e) => {
      if (e.target.closest(".drawer__link") || e.target.closest(".drawer__cta")) closeDrawer();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* =========================================================
     2) BENEFÍCIOS (CARROSSEL + DOTS)
  ========================================================= */
  const benefitsTrack = document.getElementById("benefitsTrack");
  const benefitsDots = document.getElementById("benefitsDots");

  if (benefitsTrack && benefitsDots) {
    const slides = Array.from(benefitsTrack.querySelectorAll(".benefitCard"));
    const dots = Array.from(benefitsDots.querySelectorAll(".dot"));

    const setActiveDot = (i) => dots.forEach((d, idx) => d.classList.toggle("is-active", idx === i));

    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        slides[i].scrollIntoView({ behavior: "smooth", inline: "start" });
        setActiveDot(i);
      });
    });

    const io = new IntersectionObserver((entries) => {
      let best = { idx: 0, ratio: 0 };
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const idx = Number(e.target.dataset.slide || 0);
          if (e.intersectionRatio > best.ratio) best = { idx, ratio: e.intersectionRatio };
        }
      });
      setActiveDot(best.idx);
    }, { root: benefitsTrack, threshold: [0.5, 0.7, 0.9] });

    slides.forEach((s) => io.observe(s));
  }

  /* =========================================================
     3) TRUST BAR AUTO SCROLL
  ========================================================= */
  const trustTrack = document.getElementById("trustTrack");
  const trustSection = document.querySelector(".trustbar");

  if (trustTrack && trustSection) {
    const pills = Array.from(trustTrack.querySelectorAll(".trustPill"));
    if (pills.length > 1) {
      let index = 0;
      let timer = null;
      let isVisible = false;

      const getStep = () => {
        const styles = getComputedStyle(trustTrack);
        const gap = parseFloat(styles.gap || styles.columnGap || 0) || 0;
        return pills[0].offsetWidth + gap;
      };

      const goTo = (i) => {
        index = (i + pills.length) % pills.length;
        trustTrack.scrollTo({ left: getStep() * index, behavior: "smooth" });
      };

      const stopAuto = () => { if (timer) clearInterval(timer); timer = null; };

      const startAuto = () => {
        stopAuto();
        if (!isVisible) return;
        if (window.matchMedia("(min-width: 920px)").matches) return;
        timer = setInterval(() => goTo(index + 1), 2400);
      };

      const io = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
        isVisible ? startAuto() : stopAuto();
      }, { threshold: 0.35 });

      io.observe(trustSection);

      ["touchstart","pointerdown","wheel","mouseenter"].forEach(evt =>
        trustTrack.addEventListener(evt, stopAuto, { passive: true })
      );
      ["touchend","pointerup","mouseleave"].forEach(evt =>
        trustTrack.addEventListener(evt, startAuto, { passive: true })
      );

      window.addEventListener("resize", () => {
        index = 0;
        trustTrack.scrollTo({ left: 0, behavior: "auto" });
        startAuto();
      });
    }
  }

 /* =========================
   GALERIA CTA (PG) — compatível com seu HTML
   Usa: #pgMainImg, #pgThumbs, .pg__thumb img
========================= */
(function initPGallery(){
  const main = document.getElementById("pgMainImg");
  const thumbsWrap = document.getElementById("pgThumbs");
  if (!main || !thumbsWrap) return;

  const thumbs = Array.from(thumbsWrap.querySelectorAll(".pg__thumb"));

  // abre na Foto 1
  const firstSrc = thumbs[0]?.querySelector("img")?.getAttribute("src");
  if (firstSrc) {
    main.src = firstSrc;
    thumbs.forEach(t => t.classList.remove("is-active"));
    thumbs[0].classList.add("is-active");
  }

  thumbsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".pg__thumb");
    if (!btn) return;

    const src = btn.querySelector("img")?.getAttribute("src");
    if (!src) return;

    // micro animação
    main.style.opacity = "0.35";
    requestAnimationFrame(() => {
      main.src = src;
      main.onload = () => (main.style.opacity = "1");
    });

    thumbs.forEach(t => t.classList.remove("is-active"));
    btn.classList.add("is-active");
  });

  main.addEventListener("error", () => {
    console.error("❌ Imagem principal não carregou:", main.src);
  });
})();


/* =========================
   PAINEL NOVO (carro/caminhão) + cores
   Usa: #carType, #carBrand, #carModel, #carYear,
        #colorButtons, #selectedColor, #colorSelectedText, #resultado
========================= */
(function initVehiclePanel(){
  const root = document.getElementById("widget-macena");
  if (!root) return;

  // SELECTS
  const typeSel  = root.querySelector("#carType");
  const brandSel = root.querySelector("#carBrand");
  const modelSel = root.querySelector("#carModel");
  const yearSel  = root.querySelector("#carYear");

  // CORES
  const colorWrap = root.querySelector("#colorButtons");
  const colorText = root.querySelector("#colorSelectedText");
  const colorHidden = root.querySelector("#selectedColor");
  const resultBox = root.querySelector("#resultado");

  const missingCritical = [];
  if (!typeSel) missingCritical.push("#carType");
  if (!brandSel) missingCritical.push("#carBrand");
  if (!modelSel) missingCritical.push("#carModel");
  if (!yearSel) missingCritical.push("#carYear");
  if (missingCritical.length) {
    console.warn(
      "[initVehiclePanel] Elementos ausentes no widget:",
      missingCritical.join(", ")
    );
  }

  // estado
  const state = { tipo:"", marca:"", modelo:"", ano:"", cor:"" };

  // ✅ TROQUE PELOS SEUS DADOS REAIS (posso colar completo depois)
 const dadosCarros = {
    "Fiat": { "Uno Vivace": {inicio:2010, fim:2016}, "Grande Panda (Híbrido)": {inicio:2025, fim:null}, "147 (Hatch)": {inicio:1976, fim:1987}, "147 Pick-Up": {inicio:1980, fim:1995}, "Oggi (Sedan do 147)": {inicio:1983, fim:1985}, "Panorama (Perua do 147)": {inicio:1980, fim:1986}, "Uno (Hatch)": {inicio:1984, fim:2021}, "Uno Mille": {inicio:1990, fim:2013}, "Uno Furgão": {inicio:1988, fim:2013}, "Prêmio (Sedan)": {inicio:1985, fim:1996}, "Duna (Sedan Argentina)": {inicio:1987, fim:1996}, "Elba (Perua)": {inicio:1986, fim:1996}, "Tempra (Sedan)": {inicio:1990, fim:1999}, "Tempra SW (Perua)": {inicio:1994, fim:1997}, "Tipo (Hatch)": {inicio:1988, fim:1995}, "Marea (Sedan)": {inicio:1996, fim:2007}, "Marea Weekend (Perua)": {inicio:1998, fim:2007}, "Brava (Hatch)": {inicio:1999, fim:2003}, "Bravo (Hatch)": {inicio:2010, fim:2016}, "Stilo (Hatch)": {inicio:2002, fim:2010}, "Palio (Hatch)": {inicio:1996, fim:2018}, "Palio Weekend (Perua)": {inicio:1997, fim:2018}, "Palio Weekend Adventure (Perua)": {inicio:1999, fim:2018}, "Siena (Sedan)": {inicio:1997, fim:2017}, "Grand Siena (Sedan)": {inicio:2012, fim:2021}, "Strada Cabine Simples": {inicio:1998, fim:null}, "Strada Cabine Estendida": {inicio:1999, fim:2013}, "Strada Cabine Dupla 2 Portas": {inicio:2010, fim:2020}, "Strada Cabine Dupla 3 Portas": {inicio:2014, fim:2020}, "Strada Nova Cabine Plus (CS)": {inicio:2020, fim:null}, "Strada Nova Cabine Dupla (CD)": {inicio:2020, fim:null}, "Fiorino (Furgão/Picape - Antiga)": {inicio:1980, fim:2013}, "Fiorino (Furgão - Nova Geração)": {inicio:2013, fim:null}, "Idea (Minivan)": {inicio:2003, fim:2016}, "Punto (Hatch)": {inicio:2005, fim:2018}, "Linea (Sedan)": {inicio:2007, fim:2017}, "500 (Hatch)": {inicio:2007, fim:null}, "500e (Elétrico)": {inicio:2020, fim:null}, "Toro (Picape)": {inicio:2016, fim:null}, "Titano (Picape)": {inicio:2024, fim:null}, "Argo (Hatch)": {inicio:2017, fim:null}, "Cronos (Sedan)": {inicio:2018, fim:null}, "Pulse (SUV)": {inicio:2021, fim:null}, "Pulse Abarth (Esportivo)": {inicio:2022, fim:null}, "Fastback (SUV Coupé)": {inicio:2022, fim:null}, "Fastback Abarth (Esportivo)": {inicio:2023, fim:null}, "Mobi (Subcompacto)": {inicio:2016, fim:null}, "Doblo Passageiro": {inicio:2001, fim:2021}, "Doblo Cargo (Furgão)": {inicio:2002, fim:2021}, "Freemont (SUV)": {inicio:2011, fim:2016} },
    "Volkswagen": { "Terra (Novo SUV)": {inicio:2025, fim:null}, "Fusca (Clássico)": {inicio:1938, fim:1986}, "Fusca (Itamar)": {inicio:1993, fim:1996}, "Brasília": {inicio:1973, fim:1982}, "Variant I": {inicio:1969, fim:1977}, "Variant II": {inicio:1977, fim:1981}, "TL": {inicio:1970, fim:1976}, "SP2 (Esportivo)": {inicio:1972, fim:1976}, "Karmann Ghia": {inicio:1962, fim:1975}, "New Beetle": {inicio:1997, fim:2011}, "Fusca (A5/The Beetle)": {inicio:2011, fim:2019}, "Kombi (Perua/Furgão)": {inicio:1950, fim:2013}, "Gol (Hatch - G1 a G8)": {inicio:1980, fim:2022}, "Voyage (Sedan)": {inicio:1981, fim:null}, "Parati (Perua)": {inicio:1982, fim:2012}, "Saveiro Cabine Simples": {inicio:1982, fim:null}, "Saveiro Cabine Estendida": {inicio:1999, fim:2014}, "Saveiro Cabine Dupla": {inicio:2014, fim:null}, "Apollo": {inicio:1990, fim:1992}, "Logus": {inicio:1993, fim:1997}, "Pointer": {inicio:1993, fim:1996}, "Santana (Sedan)": {inicio:1984, fim:2006}, "Quantum (Perua)": {inicio:1985, fim:2003}, "Passat (Sedan/Perua - Antigo)": {inicio:1973, fim:1988}, "Passat (Sedan - Importado)": {inicio:1994, fim:null}, "Polo (Hatch)": {inicio:2002, fim:null}, "Polo Sedan": {inicio:2002, fim:2014}, "Polo GTS (Esportivo)": {inicio:2020, fim:null}, "Polo Track (Entrada)": {inicio:2023, fim:null}, "Virtus (Sedan)": {inicio:2017, fim:null}, "Fox (Hatch)": {inicio:2003, fim:2021}, "CrossFox (Aventureiro)": {inicio:2005, fim:2021}, "SpaceFox / Space Cross (Perua)": {inicio:2006, fim:2019}, "Up! (Subcompacto)": {inicio:2014, fim:2021}, "Golf (Hatch)": {inicio:1994, fim:2020}, "Bora (Sedan)": {inicio:2000, fim:2011}, "Jetta (Sedan)": {inicio:1981, fim:null}, "Jetta Variant (Perua)": {inicio:2008, fim:2014}, "T-Cross (SUV Compacto)": {inicio:2018, fim:null}, "Nivus (SUV Coupé)": {inicio:2020, fim:null}, "Nivus GTS": {inicio:2025, fim:null}, "Taos (SUV Médio)": {inicio:2021, fim:null}, "Tiguan (SUV - Geração 1)": {inicio:2007, fim:2018}, "Tiguan Allspace (SUV - 7 Lugares)": {inicio:2017, fim:null}, "Touareg (SUV Grande)": {inicio:2002, fim:2017}, "Amarok Cabine Simples": {inicio:2010, fim:null}, "Amarok Cabine Dupla": {inicio:2010, fim:null}, "ID.3 (Elétrico Hatch)": {inicio:2019, fim:null}, "ID.4 (Elétrico SUV)": {inicio:2020, fim:null}, "ID.Buzz (Kombi Elétrica)": {inicio:2022, fim:null} },
    "Chevrolet": { "Meriva (Minivan)": {inicio:2002, fim:2012}, "Blazer EV": {inicio:2025, fim:null}, "Equinox EV": {inicio:2025, fim:null}, "Opala (Sedan/Coupé)": {inicio:1968, fim:1992}, "Caravan (Perua)": {inicio:1975, fim:1992}, "Chevette (Sedan/Hatch)": {inicio:1973, fim:1994}, "Marajó (Perua)": {inicio:1981, fim:1989}, "Chevy 500 (Picape)": {inicio:1983, fim:1995}, "C-10 / C-14": {inicio:1964, fim:1984}, "Veraneio (SUV)": {inicio:1964, fim:1994}, "Bonanza (SUV)": {inicio:1989, fim:1994}, "D20 (Picape)": {inicio:1985, fim:1997}, "Silverado (Antiga)": {inicio:1997, fim:2001}, "Nova Silverado (V8)": {inicio:2023, fim:null}, "Monza (Sedan/Hatch)": {inicio:1982, fim:1996}, "Kadett (Hatch)": {inicio:1989, fim:1998}, "Ipanema (Perua)": {inicio:1989, fim:1997}, "Omega (Sedan/Perua)": {inicio:1992, fim:1998}, "Suprema (Perua)": {inicio:1993, fim:1996}, "Corsa Hatch (Geração 1)": {inicio:1994, fim:2002}, "Corsa Sedan (Geração 1)": {inicio:1996, fim:2001}, "Corsa Wagon (Perua)": {inicio:1997, fim:2001}, "Corsa Hatch (Geração 2 - Novo Corsa)": {inicio:2002, fim:2012}, "Corsa Sedan (Geração 2 - Classic)": {inicio:2002, fim:2016}, "Corsa Pickup": {inicio:1995, fim:2003}, "Tigra (Coupé)": {inicio:1998, fim:1999}, "Vectra (Geração 1, 2 e 3)": {inicio:1993, fim:2011}, "Vectra GT (Hatch)": {inicio:2007, fim:2011}, "Astra Hatch": {inicio:1998, fim:2011}, "Astra Sedan": {inicio:1999, fim:2011}, "Celta (Hatch)": {inicio:2000, fim:2015}, "Prisma (Sedan - 1ª Geração Celta)": {inicio:2006, fim:2012}, "Onix (Hatch - 1ª Geração)": {inicio:2012, fim:2019}, "Onix Plus (Sedan - 2ª Geração)": {inicio:2019, fim:null}, "Onix Hatch (2ª Geração)": {inicio:2019, fim:null}, "Cobalt (Sedan)": {inicio:2011, fim:2020}, "Agile (Hatch)": {inicio:2009, fim:2014}, "Montana (Picape Compacta - Geração 1)": {inicio:2003, fim:2010}, "Montana (Picape Compacta - Geração 2)": {inicio:2011, fim:2021}, "Nova Montana (Picape Média/Compacta)": {inicio:2023, fim:null}, "Spin (Minivan)": {inicio:2012, fim:null}, "Cruze (Sedan)": {inicio:2011, fim:null}, "Cruze Sport6 (Hatch)": {inicio:2012, fim:null}, "Tracker (SUV)": {inicio:2013, fim:null}, "Equinox (SUV Médio)": {inicio:2017, fim:null}, "S10 Cabine Simples": {inicio:1995, fim:null}, "S10 Cabine Dupla": {inicio:1995, fim:null}, "Blazer (SUV - Base S10 Geração 1)": {inicio:1995, fim:2011}, "Trailblazer (SUV - Base S10 Geração 2)": {inicio:2012, fim:null}, "Captiva (SUV)": {inicio:2008, fim:2017}, "Camaro (Esportivo)": {inicio:2010, fim:null}, "Bolt (Elétrico)": {inicio:2017, fim:null} },
    "Ford": { "Galaxie / Landau": {inicio:1967, fim:1983}, "Maverick (Antigo V8/4cil)": {inicio:1973, fim:1979}, "Corcel (Sedan/Coupé)": {inicio:1968, fim:1986}, "Corcel II (Sedan/Coupé)": {inicio:1977, fim:1986}, "Belina (Perua)": {inicio:1970, fim:1991}, "Del Rey (Sedan)": {inicio:1981, fim:1991}, "Pampa (Picape)": {inicio:1982, fim:1997}, "F-100": {inicio:1957, fim:1986}, "F-1000 (Picape)": {inicio:1979, fim:1998}, "F-250 (Picape)": {inicio:1998, fim:2011}, "F-150 (Nova Geração)": {inicio:2023, fim:null}, "Escort (Hatch/Perua)": {inicio:1983, fim:2003}, "Escort Hobby": {inicio:1993, fim:1996}, "Verona (Sedan/Coupé - Base Escort)": {inicio:1989, fim:1996}, "Versailles (Sedan - Base Santana)": {inicio:1991, fim:1996}, "Royale (Perua - Base Quantum)": {inicio:1992, fim:1996}, "Ka (Hatch Compacto - Geração 1)": {inicio:1996, fim:2013}, "Ka (Hatch Compacto - Geração 2)": {inicio:2008, fim:2013}, "Ka (Hatch Compacto - Geração 3)": {inicio:2014, fim:2021}, "Ka Sedan (Geração 3)": {inicio:2014, fim:2021}, "Fiesta (Hatch - Importado/Street)": {inicio:1994, fim:2006}, "Fiesta (Hatch - Rocam)": {inicio:2002, fim:2014}, "Fiesta (New Fiesta)": {inicio:2011, fim:2019}, "Fiesta Sedan": {inicio:1999, fim:2019}, "Courier (Picape)": {inicio:1997, fim:2013}, "Ecosport (SUV Compacto - Geração 1)": {inicio:2003, fim:2012}, "Ecosport (SUV Compacto - Geração 2)": {inicio:2012, fim:2021}, "Focus Hatch": {inicio:1998, fim:2019}, "Focus Sedan": {inicio:2000, fim:2019}, "Fusion (Sedan Médio/Grande)": {inicio:2006, fim:2020}, "Edge (SUV)": {inicio:2008, fim:2020}, "Mondeo (Sedan/Perua)": {inicio:1993, fim:2006}, "Ranger Cabine Simples": {inicio:1994, fim:null}, "Ranger Cabine Estendida": {inicio:1994, fim:2012}, "Ranger Cabine Dupla": {inicio:1997, fim:null}, "Territory (SUV Médio)": {inicio:2019, fim:null}, "Bronco Sport (SUV Off-Road)": {inicio:2020, fim:null}, "Maverick (Picape Compacta/Média)": {inicio:2021, fim:null}, "Mustang (Esportivo Coupé/Conversível)": {inicio:2017, fim:null}, "Mustang Mach-E (Elétrico SUV)": {inicio:2020, fim:null} },
    "BMW": { "iX1 (Elétrico SUV)": {inicio:2023, fim:null}, "Série 1 (Hatch)": {inicio:2004, fim:null}, "Série 2 (Coupé/Gran Coupé)": {inicio:2013, fim:null}, "Série 3 (Sedan/Perua)": {inicio:1975, fim:null}, "Série 4 (Coupé/Conversível)": {inicio:2013, fim:null}, "Série 5 (Sedan/Perua)": {inicio:1972, fim:null}, "Série 7 (Sedan Luxo)": {inicio:1977, fim:null}, "X1 (SUV Compacto)": {inicio:2009, fim:null}, "X2 (SUV Compacto)": {inicio:2018, fim:null}, "X3 (SUV Médio)": {inicio:2003, fim:null}, "X4 (SUV Coupé)": {inicio:2014, fim:null}, "X5 (SUV Grande)": {inicio:1999, fim:null}, "X6 (SUV Coupé Grande)": {inicio:2008, fim:null}, "Z4 (Roadster)": {inicio:2002, fim:null}, "M3 (Esportivo)": {inicio:1986, fim:null}, "M4 (Esportivo)": {inicio:2014, fim:null}, "i3 (Elétrico/Híbrido)": {inicio:2013, fim:2022}, "i4 (Elétrico Gran Coupé)": {inicio:2021, fim:null}, "iX (Elétrico SUV)": {inicio:2021, fim:null}, "iX1 (Elétrico SUV)": {inicio:2023, fim:null} },
    "Audi": { "Q6 e-tron": {inicio:2025, fim:null}, "A1 (Hatch)": {inicio:2010, fim:2022}, "A3 Sportback (Hatch)": {inicio:1996, fim:null}, "A3 Sedan": {inicio:2013, fim:null}, "A4 (Sedan/Perua)": {inicio:1994, fim:null}, "A5 (Coupé/Sportback)": {inicio:2007, fim:null}, "A6 (Sedan/Perua)": {inicio:1994, fim:null}, "A7 Sportback (Coupé 4 Portas)": {inicio:2010, fim:null}, "A8 (Sedan Luxo)": {inicio:1994, fim:null}, "Q3 (SUV Compacto)": {inicio:2011, fim:null}, "Q5 (SUV Médio)": {inicio:2008, fim:null}, "Q7 (SUV Grande 7 Lugares)": {inicio:2005, fim:null}, "Q8 (SUV Coupé Grande)": {inicio:2018, fim:null}, "TT (Coupé/Roadster)": {inicio:1998, fim:2023}, "R8 (Esportivo)": {inicio:2006, fim:null}, "E-Tron (Elétrico SUV)": {inicio:2018, fim:null}, "Q4 e-tron": {inicio:2021, fim:null} },
    "Mercedes-Benz": { "Classe A (Hatch/Sedan)": {inicio:1997, fim:null}, "Classe C (Sedan/Coupé/Perua)": {inicio:1993, fim:null}, "Classe E (Sedan/Coupé/Perua)": {inicio:1953, fim:null}, "Classe S (Sedan Luxo)": {inicio:1972, fim:null}, "CLA (Coupé 4 Portas)": {inicio:2013, fim:null}, "GLA (SUV Compacto)": {inicio:2013, fim:null}, "GLB (SUV 7 Lugares)": {inicio:2019, fim:null}, "GLC (SUV Médio)": {inicio:2015, fim:null}, "GLE (SUV Grande)": {inicio:1997, fim:null}, "GLS (SUV Luxo 7 Lugares)": {inicio:2006, fim:null}, "Classe G (Jipe Off-Road)": {inicio:1979, fim:null}, "AMG GT (Esportivo)": {inicio:2014, fim:null}, "Sprinter (Van/Furgão)": {inicio:1995, fim:null}, "EQA (Elétrico SUV Compacto)": {inicio:2021, fim:null}, "EQB (Elétrico SUV 7 Lugares)": {inicio:2021, fim:null}, "EQC (Elétrico SUV Médio)": {inicio:2019, fim:null}, "EQE (Sedan Elétrico)": {inicio:2022, fim:null}, "EQS (Sedan Luxo Elétrico)": {inicio:2021, fim:null} },
    "Volvo": { "EX90 (Elétrico SUV Grande)": {inicio:2024, fim:null}, "EX30 (Elétrico SUV Subcompacto)": {inicio:2023, fim:null}, "C30 (Hatch Coupé)": {inicio:2006, fim:2013}, "S60 (Sedan)": {inicio:2000, fim:null}, "S90 (Sedan Luxo)": {inicio:2016, fim:null}, "V40 (Hatch)": {inicio:2012, fim:2019}, "V60 (Perua)": {inicio:2010, fim:null}, "XC40 (SUV Compacto)": {inicio:2017, fim:null}, "XC40 Recharge (Elétrico/Híbrido)": {inicio:2020, fim:null}, "C40 (SUV Coupé Elétrico)": {inicio:2021, fim:null}, "XC60 (SUV Médio)": {inicio:2008, fim:null}, "XC90 (SUV Grande 7 Lugares)": {inicio:2002, fim:null} },
    "Land Rover": { "Defender (Jipe Off-Road - Antigo)": {inicio:1983, fim:2016}, "Defender (SUV - Novo)": {inicio:2020, fim:null}, "Discovery (SUV Grande)": {inicio:1989, fim:null}, "Discovery Sport (SUV Médio)": {inicio:2014, fim:null}, "Freelander (SUV)": {inicio:1997, fim:2015}, "Range Rover Evoque (SUV Compacto)": {inicio:2011, fim:null}, "Range Rover Velar (SUV Coupé)": {inicio:2017, fim:null}, "Range Rover Sport (SUV Esportivo)": {inicio:2005, fim:null}, "Range Rover (SUV Luxo)": {inicio:1970, fim:null} },
    "Porsche": { "Macan EV (Elétrico)": {inicio:2025, fim:null}, "911 (Coupé/Conversível)": {inicio:1963, fim:null}, "Boxster/718 Boxster (Roadster)": {inicio:1996, fim:null}, "Cayman/718 Cayman (Coupé)": {inicio:2005, fim:null}, "Panamera (Sedan Coupé 4 Portas)": {inicio:2009, fim:null}, "Cayenne (SUV Grande)": {inicio:2002, fim:null}, "Macan (SUV Compacto)": {inicio:2014, fim:null}, "Taycan (Sedan Elétrico)": {inicio:2019, fim:null} },
    "Lexus": { "RZ 450e (Elétrico)": {inicio:2024, fim:null}, "CT 200h (Hatch Híbrido)": {inicio:2011, fim:2022}, "IS (Sedan)": {inicio:1998, fim:null}, "ES (Sedan Luxo)": {inicio:1989, fim:null}, "UX (SUV Compacto/Híbrido)": {inicio:2018, fim:null}, "NX (SUV Médio/Híbrido)": {inicio:2014, fim:null}, "RX (SUV Grande/Híbrido)": {inicio:1998, fim:null} },
    "Mini": { "Cooper (Nova Geração)": {inicio:2025, fim:null}, "Countryman (Nova Geração)": {inicio:2025, fim:null}, "Cooper (Hatch 3 Portas)": {inicio:2001, fim:2024}, "Cooper S (Hatch Esportivo)": {inicio:2001, fim:2024}, "Cooper E/SE (Elétrico)": {inicio:2020, fim:null}, "Countryman (SUV Compacto)": {inicio:2010, fim:2024}, "Clubman (Perua Compacta)": {inicio:2007, fim:null}, "Paceman": {inicio:2012, fim:2016} },
    "GWM (Great Wall)": { "Tank 300 (Jipe)": {inicio:2025, fim:null}, "Haval H6 (SUV Híbrido/PHEV)": {inicio:2023, fim:null}, "Haval H6 GT (SUV Coupé Híbrido)": {inicio:2023, fim:null}, "Ora 03 (Hatch Elétrico)": {inicio:2023, fim:null}, "Poer (Picape)": {inicio:2024, fim:null} },
    "JAC Motors": { "Hunter (Picape)": {inicio:2024, fim:null}, "J2 (Subcompacto)": {inicio:2012, fim:2016}, "J3 (Hatch)": {inicio:2011, fim:2015}, "J3 Turin (Sedan)": {inicio:2011, fim:2015}, "J5 (Sedan)": {inicio:2011, fim:2016}, "J6 (Minivan)": {inicio:2011, fim:2016}, "T40/E-JS4 (SUV Compacto)": {inicio:2016, fim:null}, "T50/iEV40 (SUV Médio)": {inicio:2018, fim:null}, "T60/T80 (SUV Grande)": {inicio:2019, fim:null}, "E-JS1 (Hatch Elétrico)": {inicio:2021, fim:null}, "V260 (Caminhão Leve)": {inicio:2017, fim:null} },
    "Toyota": { "Yaris Cross (SUV Compacto)": {inicio:2025, fim:null}, "Yaris Cross Hybrid": {inicio:2025, fim:null}, "Corolla (Sedan - Geração 1 em diante)": {inicio:1966, fim:null}, "Corolla Fielder (Perua)": {inicio:2004, fim:2008}, "Corolla Hybrid (Sedan)": {inicio:2019, fim:null}, "Corolla Cross (SUV)": {inicio:2020, fim:null}, "Corolla Cross Hybrid (SUV)": {inicio:2020, fim:null}, "GR Corolla (Hatch Esportivo)": {inicio:2022, fim:null}, "GR Yaris (Esportivo)": {inicio:2021, fim:null}, "Etios Hatch": {inicio:2010, fim:2021}, "Etios Sedan": {inicio:2012, fim:2021}, "Yaris Hatch": {inicio:2018, fim:null}, "Yaris Sedan": {inicio:2018, fim:null}, "Hilux Cabine Simples": {inicio:1968, fim:null}, "Hilux Cabine Dupla": {inicio:1968, fim:null}, "Bandeirante (Jipe/Picape)": {inicio:1962, fim:2001}, "SW4 (SUV - Base Hilux)": {inicio:1984, fim:null}, "RAV4 (SUV Compacto)": {inicio:1994, fim:null}, "RAV4 Hybrid (SUV Compacto)": {inicio:2019, fim:null}, "Camry (Sedan Grande)": {inicio:1982, fim:null}, "Prius (Híbrido)": {inicio:1997, fim:2022}, "Mirai (Hidrogênio)": {inicio:2014, fim:null} },
    "Hyundai": { "Palisade (SUV Grande)": {inicio:2024, fim:null}, "Ioniq 5": {inicio:2024, fim:null}, "HB20 (Hatch)": {inicio:2012, fim:null}, "HB20S (Sedan)": {inicio:2013, fim:null}, "HB20X (Aventureiro)": {inicio:2013, fim:2021}, "Creta (SUV Compacto)": {inicio:2016, fim:null}, "Creta N Line (Esportivo)": {inicio:2022, fim:null}, "Tucson (SUV Compacto - Geração 1)": {inicio:2004, fim:null}, "Ix35 (SUV Compacto - Geração 2)": {inicio:2010, fim:null}, "New Tucson (SUV Compacto - Geração 3)": {inicio:2015, fim:null}, "Santa Fe (SUV Médio)": {inicio:2000, fim:null}, "Vera Cruz (SUV Grande)": {inicio:2007, fim:2012}, "Elantra (Sedan)": {inicio:1990, fim:null}, "Azera (Sedan Grande)": {inicio:1996, fim:2018}, "Sonata (Sedan)": {inicio:1985, fim:null}, "Veloster (Hatch 3 Portas)": {inicio:2011, fim:2018}, "i30 (Hatch)": {inicio:2007, fim:2017}, "HR (Caminhonete)": {inicio:2005, fim:null}, "Kona (SUV Compacto)": {inicio:2017, fim:null}, "Ioniq (Híbrido/Elétrico)": {inicio:2016, fim:null} },
    "Honda": { "WR-V (Nova Geração)": {inicio:2025, fim:null}, "Civic (Sedan/Hatch - Geração 1 em diante)": {inicio:1972, fim:null}, "Civic Si (Esportivo)": {inicio:2007, fim:null}, "Civic Type R (Esportivo)": {inicio:2023, fim:null}, "Accord (Sedan)": {inicio:1976, fim:null}, "Fit (Minivan Compacta)": {inicio:2001, fim:2021}, "City Hatch": {inicio:2021, fim:null}, "City Sedan": {inicio:2009, fim:null}, "HR-V (SUV Compacto)": {inicio:2015, fim:null}, "ZR-V (SUV Médio)": {inicio:2023, fim:null}, "CR-V (SUV Médio)": {inicio:1995, fim:null}, "Pilot (SUV Grande 7 Lugares)": {inicio:2002, fim:null} },
    "Nissan": { "Kicks (Nova Geração)": {inicio:2025, fim:null}, "March (Hatch)": {inicio:2010, fim:2020}, "Versa (Sedan - 1ª Geração)": {inicio:2011, fim:2020}, "Novo Versa (Sedan - 2ª Geração)": {inicio:2020, fim:null}, "Sentra (Sedan)": {inicio:1982, fim:null}, "Tiida (Hatch)": {inicio:2007, fim:2013}, "Altima (Sedan)": {inicio:1992, fim:null}, "Kicks (SUV Compacto)": {inicio:2016, fim:null}, "Frontier Cabine Simples": {inicio:1997, fim:2010}, "Frontier Cabine Dupla": {inicio:1997, fim:null}, "X-Trail (SUV Médio)": {inicio:2000, fim:null}, "Livina (Minivan)": {inicio:2009, fim:2014}, "Grand Livina (Minivan 7 Lug)": {inicio:2009, fim:2014}, "Leaf (Elétrico)": {inicio:2010, fim:null} },
    "Renault": { "Kardian (SUV Compacto)": {inicio:2024, fim:null}, "Megane E-Tech (Elétrico)": {inicio:2022, fim:null}, "Clio (Hatch)": {inicio:1990, fim:2016}, "Clio Sedan": {inicio:2000, fim:2009}, "Logan (Sedan)": {inicio:2004, fim:null}, "Sandero (Hatch)": {inicio:2007, fim:null}, "Sandero Stepway (Aventureiro)": {inicio:2008, fim:null}, "Sandero RS (Esportivo)": {inicio:2015, fim:2021}, "Duster (SUV Compacto)": {inicio:2010, fim:null}, "Duster Oroch (Picape)": {inicio:2015, fim:null}, "Megane (Sedan/Hatch/Perua)": {inicio:1995, fim:2010}, "Fluence (Sedan)": {inicio:2011, fim:2018}, "Kwid (Subcompacto)": {inicio:2015, fim:null}, "Captur (SUV Compacto)": {inicio:2016, fim:2023}, "Koleos (SUV Médio)": {inicio:2007, fim:null}, "Kangoo (Furgão/Passageiro)": {inicio:1997, fim:null}, "Master (Furgão/Van)": {inicio:1997, fim:null}, "Zoe (Elétrico)": {inicio:2012, fim:null} },
    "Jeep": { "Avenger (SUV Compacto)": {inicio:2025, fim:null}, "Renegade (SUV Compacto)": {inicio:2014, fim:null}, "Compass (SUV Médio)": {inicio:2006, fim:null}, "Commander (SUV 7 Lugares)": {inicio:2021, fim:null}, "Wrangler (Jipe)": {inicio:1986, fim:null}, "Cherokee (SUV)": {inicio:1974, fim:null}, "Grand Cherokee (SUV Grande)": {inicio:1992, fim:null}, "Gladiator (Picape)": {inicio:2020, fim:null} },
    "Peugeot": { "e-2008 (Nova Geração)": {inicio:2024, fim:null}, "205 (Hatch)": {inicio:1983, fim:1998}, "206 (Hatch/Sedan/Perua)": {inicio:1998, fim:2012}, "207 (Hatch/Sedan/Perua)": {inicio:2006, fim:2014}, "208 (Hatch)": {inicio:2012, fim:null}, "306 (Hatch/Sedan/Perua)": {inicio:1993, fim:2002}, "307 (Hatch/Sedan)": {inicio:2001, fim:2008}, "308 (Hatch/Perua)": {inicio:2007, fim:null}, "408 (Sedan)": {inicio:2010, fim:null}, "2008 (SUV Compacto)": {inicio:2013, fim:null}, "3008 (SUV Médio)": {inicio:2008, fim:null}, "5008 (SUV 7 Lugares)": {inicio:2009, fim:null}, "Hoggar (Picape)": {inicio:2010, fim:2014}, "Partner (Furgão/Passageiro)": {inicio:1996, fim:null}, "Boxer (Van)": {inicio:1994, fim:null} },
    "Citroën": { "Basalt (SUV Coupé)": {inicio:2024, fim:null}, "C3 (Hatch)": {inicio:2002, fim:null}, "C3 Aircross (SUV/Monovolume)": {inicio:2010, fim:null}, "Novo C3 Aircross (SUV 7 Lug)": {inicio:2023, fim:null}, "C4 Hatch": {inicio:2004, fim:2014}, "C4 Pallas (Sedan)": {inicio:2007, fim:2013}, "C4 Lounge (Sedan)": {inicio:2013, fim:2021}, "C4 Cactus (Crossover)": {inicio:2014, fim:null}, "Xsara (Hatch/Perua)": {inicio:1997, fim:2005}, "Xsara Picasso (Minivan)": {inicio:1999, fim:2012}, "C5 (Sedan/Perua)": {inicio:2001, fim:2012}, "C5 Aircross (SUV Médio)": {inicio:2017, fim:null}, "Berlingo (Furgão/Passageiro)": {inicio:1996, fim:null}, "Jumpy (Furgão)": {inicio:2017, fim:null} },
    "Kia": { "EV9 (SUV Elétrico)": {inicio:2024, fim:null}, "EV5": {inicio:2025, fim:null}, "Picanto (Subcompacto)": {inicio:2004, fim:null}, "Rio (Hatch/Sedan)": {inicio:1999, fim:null}, "Cerato (Sedan)": {inicio:2003, fim:null}, "Optima (Sedan)": {inicio:2000, fim:2020}, "Sportage (SUV Compacto)": {inicio:1993, fim:null}, "Sorento (SUV Médio 7 Lugares)": {inicio:2002, fim:null}, "Mohave (SUV Grande)": {inicio:2008, fim:2017}, "Soul (Crossover)": {inicio:2008, fim:null}, "Stonic (Crossover Compacto)": {inicio:2017, fim:null}, "Carnival (Minivan)": {inicio:1998, fim:null}, "Bongo K2500 (Caminhonete Leve)": {inicio:1980, fim:null} },
    "Mitsubishi": { "L200 Triton (Nova Geração)": {inicio:2025, fim:null}, "L200 (Picape - Geração 1)": {inicio:1978, fim:null}, "L200 Triton (Picape - Geração 4 em diante)": {inicio:2005, fim:null}, "Pajero (SUV - Geração 1 e 2)": {inicio:1982, fim:null}, "Pajero Full (SUV Grande)": {inicio:1999, fim:2021}, "Pajero Sport (SUV - Base L200)": {inicio:1996, fim:null}, "Pajero TR4 (SUV Compacto - Base Jimny)": {inicio:1999, fim:2015}, "Pajero Dakar": {inicio:2009, fim:2016}, "ASX (SUV Compacto)": {inicio:2010, fim:null}, "Outlander (SUV Médio)": {inicio:2001, fim:null}, "Eclipse Cross (SUV Coupé)": {inicio:2017, fim:null}, "Lancer (Sedan)": {inicio:2007, fim:2017} },
    "Subaru": { "Impreza (Sedan/Hatch)": {inicio:1992, fim:null}, "Legacy (Sedan/Perua)": {inicio:1989, fim:null}, "Forester (SUV Compacto)": {inicio:1997, fim:null}, "Outback (Perua Aventureira)": {inicio:1994, fim:null}, "XV / Crosstrek (Crossover)": {inicio:2011, fim:null}, "BRZ (Coupé Esportivo)": {inicio:2012, fim:null}, "WRX (Esportivo)": {inicio:1992, fim:null} },
    "Suzuki": { "Vitara (SUV)": {inicio:1988, fim:null}, "Grand Vitara (SUV)": {inicio:1998, fim:null}, "Swift (Hatch)": {inicio:1983, fim:null}, "Jimny (Jipe - Geração 3)": {inicio:1970, fim:null}, "Jimny Sierra (Jipe - Geração 4)": {inicio:2018, fim:null}, "SX4 (Crossover)": {inicio:2006, fim:2014}, "S-Cross (Crossover)": {inicio:2013, fim:null} },
    "Caoa Chery": { 
        "Tiggo 2 (SUV)": {inicio:2017, fim:2023}, "Tiggo 3X (SUV)": {inicio:2021, fim:2022}, 
        "Tiggo 5X (SUV)": {inicio:2018, fim:2020}, "Tiggo 5X Pro": {inicio:2022, fim:null}, "Tiggo 5X Pro Hybrid": {inicio:2022, fim:null}, "Tiggo 5X Sport": {inicio:2023, fim:null},
        "Tiggo 7 (SUV)": {inicio:2019, fim:2021}, "Tiggo 7 Pro": {inicio:2021, fim:null}, "Tiggo 7 Pro Hybrid": {inicio:2022, fim:null}, "Tiggo 7 Sport": {inicio:2024, fim:null},
        "Tiggo 8 (SUV 7 Lug)": {inicio:2020, fim:null}, "Tiggo 8 Pro Plug-in Hybrid": {inicio:2022, fim:null}, "Tiggo 8 Pro (Combustão)": {inicio:2024, fim:null}, "Tiggo 8 Max Drive": {inicio:2022, fim:null},
        "Arrizo 5 (Sedan)": {inicio:2018, fim:2021}, "Arrizo 5 RX/RXT": {inicio:2018, fim:2021},
        "Arrizo 6 (Sedan)": {inicio:2020, fim:2022}, "Arrizo 6 Pro": {inicio:2021, fim:null}, "Arrizo 6 Pro Hybrid": {inicio:2022, fim:null},
        "iCar (Elétrico)": {inicio:2022, fim:null},
        "QQ (Subcompacto)": {inicio:2011, fim:2019}, "Celer (Hatch/Sedan)": {inicio:2013, fim:2018}, "Face (Hatch)": {inicio:2010, fim:2015}, "Cielo (Hatch/Sedan)": {inicio:2010, fim:2012}
    },
    "BYD": { "King (Sedan Híbrido)": {inicio:2024, fim:null}, "Shark (Picape Híbrida)": {inicio:2024, fim:null}, "Dolphin Mini (Elétrico Hatch)": {inicio:2023, fim:null}, "Dolphin (Elétrico Hatch)": {inicio:2021, fim:null}, "Dolphin Plus (Elétrico Hatch)": {inicio:2023, fim:null}, "Han (Elétrico Sedan)": {inicio:2020, fim:null}, "Seal (Elétrico Sedan)": {inicio:2022, fim:null}, "Song Plus (Híbrido SUV)": {inicio:2020, fim:null}, "Song Pro (Híbrido SUV)": {inicio:2020, fim:null}, "Yuan Plus (Elétrico SUV)": {inicio:2021, fim:null}, "Tan (SUV Elétrico 7 Lug)": {inicio:2020, fim:null} },
    "Foton": { "Tunland Cabine Simples (Picape)": {inicio:2013, fim:null}, "Tunland Cabine Dupla (Picape)": {inicio:2013, fim:null} },
    "Geely": { "EX2 (Elétrico)": {inicio:2025, fim:null}, "EX5 (Elétrico)": {inicio:2023, fim:null}, "EC7 (Sedan)": {inicio:2009, fim:null} },
    "Ram": { "2500 Cabine Dupla (Picape Grande)": {inicio:2003, fim:null}, "3500 Cabine Dupla (Picape Heavy Duty)": {inicio:2022, fim:null}, "1500 Rebel (Picape)": {inicio:2021, fim:null}, "1500 Limited (Picape)": {inicio:2021, fim:null}, "Classic (Picape V8)": {inicio:2022, fim:null}, "Rampage Cabine Dupla (Picape Compacta/Média)": {inicio:2023, fim:null} },
    "Haval": { "H6 (SUV)": {inicio:2011, fim:null}, "H6 GT (SUV Coupé)": {inicio:2022, fim:null}, "H6 HEV (Híbrido)": {inicio:2023, fim:null}, "H6 PHEV (Híbrido Plug-in)": {inicio:2023, fim:null}, "Jolion (SUV Compacto)": {inicio:2020, fim:null} },
    "Troller": { "T4 (Jipe)": {inicio:1997, fim:2021}, "Pantanal (Picape)": {inicio:2006, fim:2008} }
  };

const dadosCaminhoes = {
    "Volvo": { "FH Aero (Nova Geração)": {inicio:2025, fim:null}, "N10": {inicio:1980, fim:1990}, "N12": {inicio:1980, fim:1990}, "NL10": {inicio:1990, fim:1999}, "NL12": {inicio:1990, fim:1999}, "NH12": {inicio:1999, fim:2006}, "FH 460": {inicio:2012, fim:null}, "FH 540": {inicio:2012, fim:null}, "FM 330": {inicio:2010, fim:null}, "FM 370": {inicio:2010, fim:null}, "VM 270": {inicio:2003, fim:null}, "VM 310": {inicio:2003, fim:null}, "VM 330": {inicio:2012, fim:null} },
    "Scania": { "Super (Nova Linha)": {inicio:2023, fim:null}, "L 111 (Jacaré)": {inicio:1976, fim:1981}, "T 112": {inicio:1981, fim:1989}, "T 113 H": {inicio:1991, fim:1998}, "R 113": {inicio:1991, fim:1998}, "R 124": {inicio:1998, fim:2007}, "R 440": {inicio:2012, fim:2020}, "R 450": {inicio:2015, fim:null}, "R 500": {inicio:2016, fim:null}, "R 540": {inicio:2019, fim:null}, "S 540": {inicio:2019, fim:null}, "G 380": {inicio:2010, fim:2016}, "G 410": {inicio:2013, fim:null}, "P 310": {inicio:2005, fim:null}, "P 360": {inicio:2012, fim:null} },
    "Mercedes-Benz": { "eActros (Elétrico)": {inicio:2024, fim:null}, "L 1113": {inicio:1970, fim:1987}, "L 1620 (Bicudo)": {inicio:1996, fim:2012}, "1935": {inicio:1990, fim:1998}, "1938 LS": {inicio:1998, fim:2005}, "1634": {inicio:2001, fim:2012}, "Accelo 815": {inicio:2012, fim:null}, "Accelo 1016": {inicio:2012, fim:null}, "Actros 2651": {inicio:2012, fim:null}, "Actros 2546": {inicio:2003, fim:null}, "Atego 1719": {inicio:2004, fim:null}, "Atego 2426": {inicio:2004, fim:null}, "Atego 3030": {inicio:2016, fim:null}, "Axor 2544": {inicio:2001, fim:2020}, "Axor 3344": {inicio:2005, fim:2020} },
    "Volkswagen Caminhões": { "Delivery 6.160": {inicio:2017, fim:null}, "Delivery 9.170": {inicio:2017, fim:null}, "Delivery 11.180": {inicio:2017, fim:null}, "e-Delivery (Elétrico)": {inicio:2021, fim:null}, "Worker 13.180": {inicio:2000, fim:2019}, "Titan 18.310": {inicio:2002, fim:2006}, "Constellation 24.280": {inicio:2006, fim:null}, "Constellation 19.330": {inicio:2006, fim:null}, "Constellation 25.460": {inicio:2020, fim:null}, "Meteor 28.460": {inicio:2021, fim:null}, "Meteor 29.520": {inicio:2021, fim:null} },
    "Iveco": { "Daily 35S": {inicio:2008, fim:null}, "Daily 70C": {inicio:2008, fim:null}, "Vertis": {inicio:2010, fim:2016}, "Tector 170E": {inicio:2004, fim:null}, "Tector 240E": {inicio:2008, fim:null}, "Cursor 330": {inicio:2009, fim:2012}, "Stralis 440": {inicio:2002, fim:2020}, "Stralis 480": {inicio:2012, fim:2020}, "Hi-Way 440": {inicio:2012, fim:null}, "Hi-Way 480": {inicio:2012, fim:null}, "S-Way 480": {inicio:2023, fim:null} },
    "DAF": { "XF 105": {inicio:2005, fim:2020}, "XF 480 (Novo XF)": {inicio:2020, fim:null}, "XF 530 (Novo XF)": {inicio:2017, fim:null}, "CF 85": {inicio:2004, fim:2020}, "CF 460": {inicio:2017, fim:null} },
    "Ford Caminhões": { "Cargo 816": {inicio:2005, fim:2019}, "Cargo 1119": {inicio:2013, fim:2019}, "Cargo 1723": {inicio:2005, fim:2019}, "Cargo 2429": {inicio:2005, fim:2019}, "Cargo 2842 (Extra Pesado)": {inicio:2013, fim:2019}, "F-350": {inicio:1999, fim:2019}, "F-4000": {inicio:1975, fim:2019} },
    "Agrale": { "8500": {inicio:1996, fim:null}, "9200": {inicio:2005, fim:null}, "10000": {inicio:2000, fim:null}, "14000": {inicio:2010, fim:null}, "A8": {inicio:2012, fim:null}, "A10": {inicio:2015, fim:null} },
    "International": { "9800i (Rodoviário)": {inicio:2001, fim:2016}, "DuraStar (Médio)": {inicio:2002, fim:2018}, "WorkStar (Pesado Off-Road)": {inicio:2003, fim:null} },
    "Foton": { "Aumark S 315": {inicio:2015, fim:null}, "Aumark S 715": {inicio:2015, fim:null}, "Aumark S 916": {inicio:2015, fim:null}, "Aumark S 1217": {inicio:2015, fim:null}, "Auman D": {inicio:2015, fim:null} },
    "MAN": { "TGX 28.440": {inicio:2008, fim:null}, "TGX 29.480": {inicio:2010, fim:null}, "TGS 26.480": {inicio:2007, fim:null} }
  };

  function getDB(){
    return state.tipo === "caminhao" ? dadosCaminhoes : dadosCarros;
  }

  function setSelect(select, items, placeholder){
    if (!select) return;
    const safeItems = Array.isArray(items) ? items : [];
    const safePlaceholder = String(placeholder || "Selecione");

    select.innerHTML = `<option value="">${safePlaceholder}</option>`;
    safeItems.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    select.disabled = safeItems.length === 0;
  }

  function resetDownstream(from){
    if (from === "type"){
      state.marca = ""; state.modelo = ""; state.ano = ""; state.cor = "";
      setSelect(brandSel, [], "Selecione o tipo primeiro");
      setSelect(modelSel, [], "Selecione a marca primeiro");
      setSelect(yearSel, [], "Selecione o modelo primeiro");
    }
    if (from === "brand"){
      state.modelo = ""; state.ano = ""; state.cor = "";
      setSelect(modelSel, [], "Selecione a marca primeiro");
      setSelect(yearSel, [], "Selecione o modelo primeiro");
    }
    if (from === "model"){
      state.ano = ""; state.cor = "";
      setSelect(yearSel, [], "Selecione o modelo primeiro");
    }
    resetColors();
  }

  function resetColors(){
    state.cor = "";
    if (colorHidden) colorHidden.value = "";
    if (colorText) colorText.textContent = "";
    if (resultBox) resultBox.style.display = "none";
    if (colorWrap){
      colorWrap.classList.add("disabled");
      colorWrap.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    }
  }

  function enableColors(){
    if (!colorWrap) return;
    colorWrap.classList.remove("disabled");
    if (colorText) colorText.textContent = "Selecione uma opção acima";
  }

  function showResult(){
    if (!resultBox) return;
    const { tipo, marca, modelo, ano, cor } = state;
    if (!tipo || !marca || !modelo || !ano || !cor) return;

    resultBox.style.display = "block";
    resultBox.innerHTML = `
      <div class="success-box">
        <span class="success-icon">⭐</span>
        <strong>Excelente escolha!</strong><br>
        Encaixe perfeito para <strong>${tipo === "caminhao" ? "Caminhão" : "Carro"}</strong>:<br>
        <strong>${marca} ${modelo} (${ano})</strong> na cor <strong>${cor}</strong>.
        <div style="margin-top:8px; font-size:0.9em; font-weight:normal; opacity:0.9;">
           Estoque Confirmado &nbsp; | &nbsp;  Garantia Total
        </div>
      </div>
    `;
  }


  /* =========================
   ENTREGA (NOVA) — nx-ship
   - aparece sempre
   - não trava em loading
========================= */
(function initNxShip(){
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

  function rangeDatas(prazoIni, prazoFim){
    const now = new Date();
    const a = new Date(now); a.setDate(now.getDate() + prazoIni);
    const b = new Date(now); b.setDate(now.getDate() + prazoFim);
    return `${pad2(a.getDate())} de ${meses[a.getMonth()]} até ${pad2(b.getDate())} de ${meses[b.getMonth()]}`;
  }

  async function run(){
    const box = document.getElementById("nxShip");
    const cityEl = document.getElementById("nxShipCity");
    const etaEl  = document.getElementById("nxShipEta");
    if (!box || !cityEl || !etaEl) return;

    // 1) mostra IMEDIATO (sem "carregando")
    const dateRange = rangeDatas(2, 7);
    cityEl.textContent = "sua região";
    etaEl.innerHTML = `Entrega estimada entre <strong>${dateRange}</strong>.`;

    // 2) tenta cidade depois (se falhar, mantém "sua região")
    try{
      const res = await fetch("https://ipv4.wtfismyip.com/json", { cache: "no-store" });
      const data = await res.json();
      const loc = (data.YourFuckingLocation || "").replace(", Brazil", "").trim();
      if (loc) cityEl.textContent = loc + " e Região";
    }catch(e){}
  }

  // se seu script já está dentro de um DOMContentLoaded, pode chamar run() direto.
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
  // INIT: estado inicial
  resetDownstream("type");
  setSelect(brandSel, [], "Selecione o tipo primeiro");
  setSelect(modelSel, [], "Selecione a marca primeiro");
  setSelect(yearSel, [], "Selecione o modelo primeiro");

  if (typeSel){
    typeSel.value = "carro";
    state.tipo = "carro";
    setSelect(brandSel, Object.keys(dadosCarros).sort(), "Selecione a marca");
  }

  // FLOW
  typeSel?.addEventListener("change", () => {
    state.tipo = typeSel.value;
    resetDownstream("type");
    if (!state.tipo) return;

    const marcas = Object.keys(getDB()).sort();
    setSelect(brandSel, marcas, "Selecione a marca");
  });

  brandSel?.addEventListener("change", () => {
    state.marca = brandSel.value;
    resetDownstream("brand");
    if (!state.marca) return;

    const modelos = Object.keys(getDB()[state.marca] || {}).sort();
    setSelect(modelSel, modelos, "Selecione o modelo");
  });

  modelSel?.addEventListener("change", () => {
    state.modelo = modelSel.value;
    resetDownstream("model");
    if (!state.modelo) return;

    const info = getDB()?.[state.marca]?.[state.modelo];
    if (!info) return;

    const inicio = Number(info.inicio);
    const fim = (info.fim === null) ? (new Date().getFullYear() + 2) : Number(info.fim);

    const anos = [];
    for (let a = fim; a >= inicio; a--) anos.push(String(a));
    setSelect(yearSel, anos, "Selecione o ano");
  });

  yearSel?.addEventListener("change", () => {
    state.ano = yearSel.value;
    resetColors();
    if (state.ano) enableColors();
  });

  // CORES (3)
  colorWrap?.addEventListener("click", (e) => {
    if (colorWrap.classList.contains("disabled")) return;

    const btn = e.target.closest(".color-btn");
    if (!btn) return;

    const cor = btn.dataset.color;
    if (!cor) return;

    colorWrap.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");

    state.cor = cor;
    if (colorHidden) colorHidden.value = cor;
    if (colorText) colorText.textContent = `Cor selecionada: ${cor}`;

    showResult();
  });

  // deixa estado acessível pro Modal/Checkout
  window.__vehicleState = state;
  // banco de veiculos acessivel pra busca com autocompletar
  window.__carDB = dadosCarros;
})();


/* =========================
   KIT SELECT (2 boxes) + enviar pro Modal
   Usa: .nkitCard + data-kit="carro_sem|carro_com"
========================= */
(function initKitSelect(){
  if (document.querySelector("#nkit .nkitLine")) return;

  const wrap = document.querySelector(".nkit__grid");
  if (!wrap) return;

  const cards = Array.from(wrap.querySelectorAll(".nkitCard"));
  if (!cards.length) return;

  // estado global do kit
  const kitState = { key: "carro_sem", label: "Kit Sem porta-malas" };

  function labelByKey(key){
    // se quiser trocar o texto, é aqui
    if (key === "carro_com") return "Kit Com porta-malas";
    return "Kit Sem porta-malas";
  }

  function setSelected(card){
    cards.forEach(c => {
      c.classList.remove("is-selected");
      c.setAttribute("aria-checked", "false");
    });

    card.classList.add("is-selected");
    card.setAttribute("aria-checked", "true");

    const key = card.dataset.kit || "carro_sem";
    kitState.key = key;
    kitState.label = labelByKey(key);

    // deixa acessível pro Modal/Checkout
    window.__kitState = kitState;
  }

  // init: pega o que já está marcado no HTML
  const initial = cards.find(c => c.classList.contains("is-selected")) || cards[0];
  setSelected(initial);

  // click
  wrap.addEventListener("click", (e) => {
    const card = e.target.closest(".nkitCard");
    if (!card) return;
    setSelected(card);
  });
})();


/* =========================
   MODAL + CHECKOUT (6 links: carro/caminhão * 3 cores)
   Preenche: marca/modelo/ano + (tipo/cor se você adicionar no HTML do modal)
========================= */
(() => {
  // Modal/checkout flow is unified in the block below to avoid duplicate listeners.
})();






  /* =========================================================
     7) FAQ ACCORDION
  ========================================================= */
  document.querySelectorAll(".faq__question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains("is-open");
      document.querySelectorAll(".faq__item").forEach(i => i.classList.remove("is-open"));
      if (!isOpen) item.classList.add("is-open");
    });
  });

  /* =========================================================
     8) ESTOQUE
  ========================================================= */
  const stockEl = document.getElementById("stockCount");
  const fillEl  = document.getElementById("stockFill");
  if (stockEl && fillEl) {
    let stock = 109;
    const minStock = 23;

    const updateBar = () => {
      const percent = Math.max(12, (stock / 200) * 100);
      fillEl.style.width = percent + "%";
    };

    updateBar();

    setInterval(() => {
      if (stock > minStock) {
        stock--;
        stockEl.textContent = stock;
        updateBar();
      }
    }, Math.floor(Math.random() * 15000) + 25000);
  }

});

/* =========================================================
   9) CONTADOR 0 → 5000 (fora do DOMContentLoaded ok)
========================================================= */
const counterEl = document.getElementById("countValue");
if (counterEl) {
  let started = false;
  const target = 5000;
  const duration = 3600;
  const stepTime = 20;
  const increment = target / (duration / stepTime);

  const startCounter = () => {
    if (started) return;
    started = true;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counterEl.textContent = target;
        clearInterval(timer);
      } else {
        counterEl.textContent = Math.floor(current);
      }
    }, stepTime);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        startCounter();
        observer.disconnect();
      }
    },
    { threshold: 0.5 }
  );

  observer.observe(counterEl);
}
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("#nkit .nkitLine")) return; // legacy flow disabled on the enhanced LP

  /* =========================
     UTM helper
  ========================= */
  function goWithUtm(url){
    if (!url) return;
    const params = window.location.search;
    window.location.href = params
      ? (url.includes("?") ? url + "&" + params.substring(1) : url + params)
      : url;
  }

  /* =========================
     Estado global único
  ========================= */
  window.__vehicleState = window.__vehicleState || {
    tipo: "",     // "carro" | "caminhao"
    marca: "",
    modelo: "",
    ano: "",
    cor: "",      // "Preto" | "Cinza" | "Bege"
    kit: "carro_sem" // "carro_sem" | "carro_com"  (caminhão é decidido no painel)
  };
  const st = window.__vehicleState;

  /* =========================
     1) KIT (2 opções)
  ========================= */
  const kitRoot = document.getElementById("nkit");
  const kitCards = kitRoot ? Array.from(kitRoot.querySelectorAll(".nkitCard")) : [];
  const buyBtn = document.querySelector(".cta__buy");

  // PREÇOS por kit (você pode ajustar)
  const PRICES = {
    carro_sem: { old: 397.93, now: 146.83 },
    carro_com: { old: 485.67, now: 189.65 },
    // caminhão usa o preço que você quiser (se for diferente, troque aqui)
    caminhao:  { old: 397.93, now: 73.83 }
  };

  const INSTALLMENTS = {
    n: 12,
    // Se tiver juros, coloque aqui (ex: 0.0199). Se não, deixa 0.
    monthlyInterest: 0
  };

  const fmtBRL = (v) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function calcInstallment(total, n, i){
    if (!n || n <= 0) return total;
    if (!i || i <= 0) return total / n;
    const pow = Math.pow(1 + i, -n);
    return (total * i) / (1 - pow);
  }

  function setSelectedKit(kit){
    st.kit = kit;
    window.__kitState = {
      key: kit,
      label:
        kit === "carro_com"
          ? "Kit Com porta-malas"
          : kit === "caminhao"
            ? "Caminhão - Padrão"
            : "Kit Sem porta-malas"
    };

    kitCards.forEach(btn => {
      const is = btn.dataset.kit === kit;
      btn.classList.toggle("is-selected", is);
      btn.setAttribute("aria-checked", is ? "true" : "false");
    });

    // Atualiza textos nas box (old/now/save)
    updateKitCardNumbers();

    // Atualiza o SEU bloco de preço (cta__price)
    updatePriceBlock();
  }

  function updateKitCardNumbers(){
    ["carro_sem","carro_com"].forEach(k => {
      const p = PRICES[k];
      const save = Math.max(0, p.old - p.now);

      const elOld = document.querySelector(`[data-old="${k}"]`);
      const elNow = document.querySelector(`[data-now="${k}"]`);
      const elSave = document.querySelector(`[data-save="${k}"]`);

      if (elOld) elOld.textContent = p.old.toFixed(2).replace(".", ",");
      if (elNow) elNow.textContent = p.now.toFixed(2).replace(".", ",");
      if (elSave) elSave.textContent = save.toFixed(2).replace(".", ",");
    });
  }

  function currentKitResolved(){
    // Caminhão é escolhido no painel de baixo
    const carType = document.getElementById("carType");
    const tipo = (carType?.value || st.tipo || "").trim();

    if (tipo === "caminhao") return "caminhao";
    return st.kit || "carro_sem";
  }

  function updatePriceBlock(){
    const kit = currentKitResolved();
    const p = PRICES[kit] || PRICES.carro_sem;

    const root = document.getElementById("ctaPrice");
    if (!root) return;

    const elOldSpan = root.querySelector(".cta__priceCompare span");
    const elNow = root.querySelector(".cta__priceMain");
    const elSub = root.querySelector(".cta__priceSub");

    if (elOldSpan) elOldSpan.textContent = fmtBRL(p.old);
    if (elNow) elNow.textContent = fmtBRL(p.now);

    if (elSub){
      elSub.textContent = "Desconto válido somente em pagamentos via Pix";
    }
  }

  if (kitCards.length){
    // init numbers
    updateKitCardNumbers();

    // init selection
    setSelectedKit(st.kit || "carro_sem");

    kitRoot.addEventListener("click", (e) => {
      const btn = e.target.closest(".nkitCard");
      if (!btn) return;
      setSelectedKit(btn.dataset.kit);
    });
  }

  /* =========================
     2) Lê o painel de baixo (sem mexer no seu painel)
     IDs esperados:
     #carType #carBrand #carModel #carYear #selectedColor
  ========================= */
  function syncFromPanel(){
    const carType  = document.getElementById("carType");
    const carBrand = document.getElementById("carBrand");
    const carModel = document.getElementById("carModel");
    const carYear  = document.getElementById("carYear");
    const colorInp = document.getElementById("selectedColor");

    st.tipo   = (carType?.value || st.tipo || "").trim();
    st.marca  = (carBrand?.value || st.marca || "").trim();
    st.modelo = (carModel?.value || st.modelo || "").trim();
    st.ano    = (carYear?.value || st.ano || "").trim();
    st.cor    = (colorInp?.value || st.cor || "").trim();

    // sempre que painel muda, preço pode mudar (se trocar para caminhão)
    updatePriceBlock();
  }

  ["change","input"].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const id = e.target?.id;
      if (["carType","carBrand","carModel","carYear","selectedColor"].includes(id)){
        syncFromPanel();
      }
    });
  });

  // sync initial
  syncFromPanel();

  /* =========================
     3) Modal + 9 links checkout
  ========================= */
  const modal = document.getElementById("confirmModal");
  const payBtn = document.getElementById("goToPayment");



  function kitLabel(kit){
    const map = {
      carro_sem: "Kit Tapetes Interno — Sem porta-malas",
      carro_com: "Kit Tapetes Interno — Com porta-malas",
      caminhao:  "Caminhão — Padrão"
    };
    return map[kit] || "—";
  }

  function openModal(){
    syncFromPanel();

    const kit = currentKitResolved();

    const elKit = document.getElementById("sumKit");
    const rowKit = elKit ? elKit.parentElement : null;
    const elType = document.getElementById("sumType");
    const elBrand = document.getElementById("sumBrand");
    const elModel = document.getElementById("sumModel");
    const elYear = document.getElementById("sumYear");
    const elColor = document.getElementById("sumColor");

    if (window.nxSyncTexture) window.nxSyncTexture();

    if (rowKit) rowKit.style.display = "";
    if (elKit) elKit.textContent = kit === "caminhao" ? "Não aplicável" : kitLabel(kit);
    if (elType) elType.textContent = (kit === "caminhao") ? "Caminhão" : "Carro";

    if (elBrand) elBrand.textContent = st.marca || "—";
    if (elModel) elModel.textContent = st.modelo || "—";
    if (elYear) elYear.textContent = st.ano || "—";
    if (elColor) elColor.textContent = st.cor || "—";

    if (modal){
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden","false");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      /* sem rAF: a propria funcao ja resolve o tempo do layout, e rAF nao
         dispara com a aba em segundo plano */
      if (window.nxUpdateModalHint) window.nxUpdateModalHint();
    }
  }

  function closeModal(){
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  if (buyBtn){
    buyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  }

  if (modal){
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest(".modal__overlay, #closeModal, #backToEdit, [data-close]")) {
        closeModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* O listener que existia aqui era o segundo do #goToPayment e apontava
     para o mapa CHECKOUT de placeholders. Como ele era registrado ANTES do
     handler real (mais abaixo), disparava primeiro e levava o cliente para
     "COLOQUE URL CHECKOUT AQUI". Hoje o pagamento tem um caminho so.      */

});
(function initReviewVideos(){
  const blocks = Array.from(document.querySelectorAll("[data-video]"));
  if(!blocks.length) return;

  function stopOthers(except){
    blocks.forEach(b=>{
      if(b === except) return;
      const v = b.querySelector("video");
      if(v && !v.paused){
        v.pause();
        b.classList.remove("is-playing");
      }
    });
  }

  blocks.forEach(block=>{
    const video = block.querySelector("video");
    const playBtn = block.querySelector(".reviewVideo__play");
    const soundBtn = block.querySelector(".reviewVideo__sound");
    if(!video || !playBtn) return;

    const syncSoundIcon = () => {
      if (soundBtn) soundBtn.textContent = video.muted ? "🔇" : "🔊";
    };

    const pauseVideo = () => {
      video.pause();
      block.classList.remove("is-playing");
    };

    const playVideo = async () => {
      stopOthers(block);

      try{
        video.muted = false;
        video.volume = 1;
        await video.play();
      }catch(e){
        video.muted = true;
        await video.play().catch(() => {});
      }

      syncSoundIcon();
      block.classList.add("is-playing");
    };

    video.muted = true;
    video.controls = false;
    syncSoundIcon();

    playBtn.addEventListener("click", ()=>{
      if (video.paused) {
        playVideo();
        return;
      }
      pauseVideo();
    });

    soundBtn?.addEventListener("click", (e)=>{
      e.stopPropagation();
      video.muted = !video.muted;
      syncSoundIcon();
    });

    video.addEventListener("click", () => {
      if (video.paused) {
        playVideo();
        return;
      }
      pauseVideo();
    });

    video.addEventListener("pause", ()=> block.classList.remove("is-playing"));
    video.addEventListener("ended", ()=> block.classList.remove("is-playing"));
  });
})();

(function initNxSatAutoScrollHorizontal(){
  const track = document.getElementById("nxSatTrack");
  const viewport = document.getElementById("nxSatViewport");
  if (!track || !viewport) return;

  const original = Array.from(track.children);
  if (original.length < 2) return;

  // duplica para loop infinito
  original.forEach(el => track.appendChild(el.cloneNode(true)));

  let x = 0;
  let speed = 0.85;   // 0.30 mais lento / 0.55 mais rápido
  let paused = false;

  function getLoopWidth(){
    // largura total do bloco original (sem a duplicação)
    const gap = parseFloat(getComputedStyle(track).gap || 0) || 0;
    let w = 0;
    for (let i = 0; i < original.length; i++){
      w += original[i].offsetWidth;
      if (i !== original.length - 1) w += gap;
    }
    return w;
  }

  let loopW = 0;
  const recalc = () => { loopW = getLoopWidth(); };

  const tick = () => {
    if (!paused && loopW > 0){
      x += speed;
      if (x >= loopW) x = 0;
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
    }
    requestAnimationFrame(tick);
  };

  // pausa ao interagir
  const pause = () => paused = true;
  const play  = () => paused = false;

  viewport.addEventListener("mouseenter", pause);
  viewport.addEventListener("mouseleave", play);
  viewport.addEventListener("touchstart", pause, { passive:true });
  viewport.addEventListener("touchend", play, { passive:true });
  viewport.addEventListener("pointerdown", pause);
  viewport.addEventListener("pointerup", play);

  // inicia
  requestAnimationFrame(() => {
    recalc();
    tick();
  });
  window.addEventListener("resize", () => {
    recalc();
    track.style.transform = "translate3d(0,0,0)";
    x = 0;
  });
  
})();
const texts = [
 "💡 Apenas R$ 4,89 por dia",
 "🛡️ Proteção por centavos",
 "🔥 Oferta por tempo limitado"
];

let i = 0;
const el = document.querySelector(".cta__priceDaily");

setInterval(()=>{
  if(!el) return;
  el.style.opacity = 0;
  setTimeout(()=>{
    el.textContent = texts[i++ % texts.length];
    el.style.opacity = 1;
  },300);
},2500);


(() => {
  const KEY = "nx_texture";
  const row = document.getElementById("txMiniRow");
  const sumTexture = document.getElementById("sumTexture");

  if (!row) return;

  const opts = Array.from(row.querySelectorAll(".txMini__opt"));

  // Lightbox
  const zoom = document.getElementById("txZoom");
  const zoomImg = document.getElementById("txZoomImg");
  const zoomCap = document.getElementById("txZoomCap");

  const openZoom = (src, label) => {
    if (!zoom || !zoomImg || !zoomCap) return;
    zoomImg.src = src;
    zoomImg.alt = label || "Textura";
    zoomCap.textContent = label || "";
    zoom.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  };

  const closeZoom = () => {
    if (!zoom || !zoomImg || !zoomCap) return;
    zoom.setAttribute("aria-hidden", "true");
    zoomImg.src = "";
    zoomCap.textContent = "";
    document.documentElement.style.overflow = "";
  };

  // fechar overlay/X
  zoom?.addEventListener("click", (e) => {
    if (e.target.closest("[data-txzoom-close]")) closeZoom();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && zoom?.getAttribute("aria-hidden") === "false") closeZoom();
  });

  // Seleção visual
  const setActive = (name) => {
    opts.forEach((b) => {
      const on = (b.dataset.texture || "") === name;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (sumTexture) sumTexture.textContent = name || "—";
  };

  // clique dentro da faixa
  row.addEventListener("click", (e) => {
    // clique no VER
    const zoomBtn = e.target.closest("[data-zoom]");
    if (zoomBtn) {
      e.preventDefault();
      e.stopPropagation();
      const opt = zoomBtn.closest(".txMini__opt");
      const img = opt?.querySelector("img");
      const label = opt?.dataset.texture || img?.alt || "Textura";
      if (img?.src) openZoom(img.src, label);
      return;
    }

    // clique no card seleciona
    const opt = e.target.closest(".txMini__opt");
    if (!opt) return;

    const name = opt.dataset.texture || "";
    setActive(name);
    localStorage.setItem(KEY, name);
  });

  // acessibilidade (enter/space seleciona)
  row.addEventListener("keydown", (e) => {
    const opt = e.target.closest(".txMini__opt");
    if (!opt) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const name = opt.dataset.texture || "";
      setActive(name);
      localStorage.setItem(KEY, name);
    }
  });

  // sync (chame ao abrir o modal)
  window.nxSyncTexture = () => {
    const saved = localStorage.getItem(KEY) || "";
    setActive(saved);
  };

  // init
  window.nxSyncTexture();
})();

(function modalScrollHint(){
  const content = document.getElementById("modalContent");
  const hint = document.getElementById("modalScrollHint");
  if(!content || !hint) return;

  /* A versao anterior media o scroll e escrevia display/opacity a CADA
     evento. Ler scrollHeight logo depois de escrever display forca o
     navegador a refazer o layout do modal no meio do gesto.
     Agora a leitura acontece uma vez por quadro e a escrita so sai quando
     o valor muda de verdade — na maior parte do arrasto, nada e escrito. */
  let agendado = false;
  let ultimoDisplay = null;
  let ultimaOpacidade = null;

  function aplicarHint(){
    agendado = false;
    const temScroll = content.scrollHeight > content.clientHeight + 6;
    const noTopo    = content.scrollTop <= 2;
    const noFim     = (content.scrollTop + content.clientHeight) >= (content.scrollHeight - 2);

    const display   = (temScroll && !noFim) ? "block" : "none";
    const opacidade = (temScroll && noTopo) ? "1" : "0.85";

    if (display !== ultimoDisplay){ hint.style.display = display; ultimoDisplay = display; }
    if (opacidade !== ultimaOpacidade){ hint.style.opacity = opacidade; ultimaOpacidade = opacidade; }
  }

  /* O batch por quadro so vale para a enxurrada de eventos do arrasto.
     Na abertura do modal — que e quando nxUpdateModalHint e chamado — o
     estado precisa estar certo ja no primeiro pixel pintado, sem esperar
     quadro nenhum. Por isso a primeira passada e sincrona. */
  function updateHint(imediato){
    if (imediato === true || ultimoDisplay === null) { agendado = false; aplicarHint(); return; }
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(aplicarHint);
  }

  /* Chamado na abertura do modal. Nesse instante o .modal__content ainda
     nao foi medido — scrollHeight e clientHeight sao iguais — e por isso a
     dica "Arraste para ver mais" nunca aparecia, mesmo com a lista rolando.
     A passada sincrona cobre o caso de o modal ja estar medido; o setTimeout
     de 0 cobre o caso normal, rodando depois que o layout assenta. Nao uso
     requestAnimationFrame aqui porque ele nao dispara em aba de fundo. */
  window.nxUpdateModalHint = function(){
    updateHint(true);
    setTimeout(function(){ updateHint(true); }, 0);
  };

  content.addEventListener("scroll", updateHint, { passive:true });
  window.addEventListener("resize", updateHint);

})();

/* Com o modal aberto, os 4 videos de fundo continuavam em autoplay/loop,
   decodificando quadro a quadro atras de uma camada que ninguem ve. Isso
   disputava a mesma thread do scroll do modal. Aqui eles param na abertura
   e voltam ao fechar — quem estava pausado antes continua pausado. */
(function pausarFundoComModalAberto(){
  const modal = document.getElementById("confirmModal");
  if (!modal) return;

  const deFundo = () => Array.from(document.querySelectorAll("video[autoplay]"));
  let pausadosPorMim = [];

  function aplicar(){
    const aberto = modal.getAttribute("aria-hidden") === "false"
                || modal.classList.contains("is-open");
    if (aberto) {
      if (pausadosPorMim.length) return;
      deFundo().forEach(v => { if (!v.paused) { v.pause(); pausadosPorMim.push(v); } });
    } else if (pausadosPorMim.length) {
      const naoVoltaram = [];
      pausadosPorMim.forEach(v => {
        const p = v.play();
        if (p && p.catch) p.catch(() => naoVoltaram.push(v));
      });
      pausadosPorMim = [];
      /* Se o play for recusado — aba em segundo plano, economia de bateria —
         o video ficaria congelado para sempre depois de fechar o modal.
         Entao a tentativa fica pendurada na proxima vez que a aba aparecer. */
      if (naoVoltaram.length) retomarQuandoVisivel(naoVoltaram);
    }
  }

  function retomarQuandoVisivel(lista){
    const tentar = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", tentar);
      lista.forEach(v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); });
    };
    document.addEventListener("visibilitychange", tentar);
  }

  new MutationObserver(aplicar).observe(modal, {
    attributes: true, attributeFilter: ["aria-hidden", "class"]
  });
  aplicar();
})();

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("nkit");
  const buyBtn = document.querySelector(".cta__buy");
  const modal = document.getElementById("confirmModal");
  const payBtn = document.getElementById("goToPayment");
  const closeBtn = document.getElementById("closeModal");
  const backBtn = document.getElementById("backToEdit");
  const overlay = modal?.querySelector(".modal__overlay") || null;

  if (!root || !buyBtn || !modal || !payBtn) return;

  const kitCards = Array.from(root.querySelectorAll(".nkitCard"));
  const lineButtons = Array.from(root.querySelectorAll(".nkitLine"));
  const KIT_KEYS = ["carro_sem", "carro_com"];
  const PANEL_IDS = ["carType", "carBrand", "carModel", "carYear", "selectedColor"];

  window.__vehicleState = window.__vehicleState || {};
  const st = window.__vehicleState;
  st.kit = st.kit || "carro_sem";
  st.line = st.line || "primeira_linha";
  const ORDINAL_FEM = "\u00aa";

  const LINE_LABELS = {
    primeira_linha: `1${ORDINAL_FEM} Linha`,
    segunda_linha: `2${ORDINAL_FEM} Linha`
  };

  /* CHECKOUT PROPRIO
     Aqui existiam 6 links para o gateway do dono original desta pagina:
     toda venda cairia na conta dele. O pedido agora e gravado no
     localStorage e lido pelo checkout.html desta loja.                     */
  const CHECKOUT_URL = "/checkout";
  const CART_KEY     = "tapecar-cart-v1";
  const COLOR_KEYS = ["Preto", "Cinza", "Bege"];

  const PRODUCT_LINES = {
    primeira_linha: {
      cards: {
        carro_sem: {
          badgeText: "MELHOR PRECO",
          badgeSoft: true,
          thumb: "images/SEMPORTAMALAS.jpg",
          thumbAlt: `Kit sem porta-malas da 1${ORDINAL_FEM} linha`,
          namePrefix: "Kit Tapetes Interno",
          nameStrong: "Sem porta malas",
          modalLabel: "Kit Tapetes Interno - Sem porta-malas",
          old: 267.97,
          now: 146.83
        },
        carro_com: {
          badgeText: "MAIS VENDIDO",
          badgeSoft: false,
          thumb: "images/PORTAMALAS.png",
          thumbAlt: `Kit com porta-malas da 1${ORDINAL_FEM} linha`,
          namePrefix: "Kit Tapetes Interno",
          nameStrong: "+ Porta malas",
          modalLabel: "Kit Tapetes Interno - Com porta-malas",
          old: 327.97,
          now: 189.65
        }
      }
    },
    segunda_linha: {
      cards: {
        carro_sem: {
          badgeText: "PRECO ACESSIVEL",
          badgeSoft: true,
          thumb: "images/SEMPORTAMALAS.jpg",
          thumbAlt: `Kit sem porta-malas da 2${ORDINAL_FEM} linha`,
          namePrefix: "Kit Tapetes Interno",
          nameStrong: `2${ORDINAL_FEM} linha - Sem porta malas`,
          modalLabel: `Kit Tapetes Interno 2${ORDINAL_FEM} Linha - Sem porta-malas`,
          old: 194.97,
          now: 146.83
        },
        carro_com: {
          badgeText: "CUSTO-BENEFICIO",
          badgeSoft: false,
          thumb: "images/PORTAMALAS.png",
          thumbAlt: `Kit com porta-malas da 2${ORDINAL_FEM} linha`,
          namePrefix: "Kit Tapetes Interno",
          nameStrong: `2${ORDINAL_FEM} linha - + Porta malas`,
          modalLabel: `Kit Tapetes Interno 2${ORDINAL_FEM} Linha - Com porta-malas`,
          old: 223.97,
          now: 189.65
        }
      }
    }
  };

  const INSTALLMENTS = { n: 12, monthlyInterest: 0 };

  const fmtBRL = (v) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function isReadyCheckoutUrl(url){
    /* aceita tambem caminho relativo, que e o caso de checkout.html */
    return typeof url === "string" && url.trim() !== "";
  }

  function goWithUtm(url){
    if (!isReadyCheckoutUrl(url)) {
      console.warn("Checkout URL pending for this combination:", url);
      return;
    }
    const params = window.location.search;
    window.location.href = params
      ? (url.includes("?") ? url + "&" + params.substring(1) : url + params)
      : url;
  }

  function calcInstallment(total, n, i){
    if (!n || n <= 0) return total;
    if (!i || i <= 0) return total / n;
    const pow = Math.pow(1 + i, -n);
    return (total * i) / (1 - pow);
  }

  function safeLine(line){
    return PRODUCT_LINES[line] ? line : "primeira_linha";
  }

  function safeKit(kit){
    return KIT_KEYS.includes(kit) ? kit : "carro_sem";
  }

  function safeColor(color){
    return COLOR_KEYS.includes(color) ? color : "";
  }

  function lineConfig(line = st.line){
    return PRODUCT_LINES[safeLine(line)] || PRODUCT_LINES.primeira_linha;
  }

  function currentType(){
    const carType = document.getElementById("carType");
    return (carType?.value || st.tipo || "carro").trim();
  }

  function currentKitResolved(){
    return safeKit(st.kit);
  }

  function currentProduct(){
    const kit = currentKitResolved();
    return lineConfig().cards[kit] || PRODUCT_LINES.primeira_linha.cards.carro_sem;
  }

  function checkoutUrlFor(){
    return CHECKOUT_URL;
  }

  function resolveCheckoutState(){
    const line  = safeLine(st.line);
    const kit   = safeKit(st.kit);
    const color = safeColor(st.cor);

    const checkoutState = {
      line,
      kit,
      color,
      url: CHECKOUT_URL,
      /* o destino existe sempre; o que pode faltar e a escolha da cor */
      isPlaceholder: !color
    };

    window.__checkoutState = checkoutState;
    return checkoutState;
  }

  /* Formato lido por checkout.js: um array de itens no localStorage. */
  function montarCarrinho(){
    const line = safeLine(st.line);
    const kit  = safeKit(st.kit);
    const prod = (PRODUCT_LINES[line] || PRODUCT_LINES.primeira_linha).cards[kit]
              || PRODUCT_LINES.primeira_linha.cards.carro_sem;
    const veiculo = [st.marca, st.modelo, st.ano].filter(Boolean).join(" ");

    return [{
      key:   `tapetes-${line}-${kit}-${st.cor}`,
      id:    "tapetes-automotivos-sob-medida",
      name:  prod.modalLabel,
      price: prod.now,
      image: prod.thumb,
      color: st.cor,
      size:  veiculo || "Sob medida",
      qty:   1,
      vehicle: {
        tipo:   st.tipo || "carro",
        marca:  st.marca,
        modelo: st.modelo,
        ano:    st.ano,
        linha:  LINE_LABELS[line],
        kit
      }
    }];
  }

  function closeModal(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function handleCheckoutClick(){
    syncFromPanel();
    const checkoutState = resolveCheckoutState();
    payBtn.dataset.checkoutUrl = checkoutState.url;

    if (checkoutState.isPlaceholder) {
      window.alert("Escolha a cor do tapete antes de continuar.");
      return;
    }

    try {
      localStorage.setItem(CART_KEY, JSON.stringify(montarCarrinho()));
    } catch (err) {
      /* navegador anonimo com storage bloqueado: nao trava a venda */
      console.warn("[checkout] nao consegui gravar o carrinho:", err);
    }

    goWithUtm(checkoutState.url);
  }

  function syncWindowKitState(){
    const kit = currentKitResolved();
    window.__kitState = {
      key: kit,
      baseKey: safeKit(st.kit),
      line: safeLine(st.line),
      lineLabel: LINE_LABELS[safeLine(st.line)],
      label: currentProduct().modalLabel
    };
    resolveCheckoutState();
  }

  function renderLineButtons(){
    lineButtons.forEach(btn => {
      const is = btn.dataset.line === safeLine(st.line);
      btn.classList.toggle("is-active", is);
      btn.setAttribute("aria-pressed", is ? "true" : "false");
    });
  }

  function syncSelectedKitUI(){
    kitCards.forEach(card => {
      const is = card.dataset.kit === st.kit;
      card.classList.toggle("is-selected", is);
      card.setAttribute("aria-checked", is ? "true" : "false");
    });
  }

  function updateKitCardNumbers(){
    const cardsCfg = lineConfig().cards;

    KIT_KEYS.forEach((kitKey) => {
      const product = cardsCfg[kitKey];
      const oldPrice = Number(product.old);
      const nowPrice = Number(product.now);
      const save = Math.max(0, oldPrice - nowPrice);
      const discount = oldPrice > nowPrice && oldPrice > 0
        ? Math.round(((oldPrice - nowPrice) / oldPrice) * 100)
        : 0;
      const elOld = root.querySelector(`[data-old="${kitKey}"]`);
      const elNow = root.querySelector(`[data-now="${kitKey}"]`);
      const elSave = root.querySelector(`[data-save="${kitKey}"]`);
      const elDiscount = root.querySelector(`[data-discount="${kitKey}"]`);

      if (elOld) elOld.textContent = oldPrice.toFixed(2).replace(".", ",");
      if (elNow) elNow.textContent = nowPrice.toFixed(2).replace(".", ",");
      if (elSave) elSave.textContent = save.toFixed(2).replace(".", ",");

      if (elDiscount){
        if (discount > 0){
          elDiscount.hidden = false;
          elDiscount.textContent = `-${discount}% OFF`;
        } else {
          elDiscount.hidden = true;
          elDiscount.textContent = "";
        }
      }
    });
  }

  function renderKitCards(){
    const cardsCfg = lineConfig().cards;

    KIT_KEYS.forEach((kitKey) => {
      const cfg = cardsCfg[kitKey];
      const card = kitCards.find(btn => btn.dataset.kit === kitKey);
      if (!cfg || !card) return;

      const badge = card.querySelector(`[data-kit-badge="${kitKey}"]`);
      const prefix = card.querySelector(`[data-kit-name-prefix="${kitKey}"]`);
      const strong = card.querySelector(`[data-kit-name-strong="${kitKey}"]`);
      const thumb = card.querySelector(`[data-kit-thumb="${kitKey}"]`);

      if (badge){
        badge.textContent = cfg.badgeText;
        badge.classList.toggle("nkitCard__badge--soft", !!cfg.badgeSoft);
      }
      if (prefix) prefix.textContent = cfg.namePrefix;
      if (strong) strong.textContent = cfg.nameStrong;
      if (thumb){
        thumb.src = cfg.thumb;
        thumb.alt = cfg.thumbAlt || cfg.modalLabel || "";
      }
    });

    updateKitCardNumbers();
    syncSelectedKitUI();
  }

  function updatePriceBlock(){
    const product = currentProduct();
    const rootPrice = document.getElementById("ctaPrice");
    if (!rootPrice) return;

    const elOldSpan = rootPrice.querySelector(".cta__priceCompare span");
    const elNow = rootPrice.querySelector(".cta__priceMain");
    const elSub = rootPrice.querySelector(".cta__priceSub");

    if (elOldSpan) elOldSpan.textContent = fmtBRL(product.old);
    if (elNow) elNow.textContent = fmtBRL(product.now);
    if (elSub){
      elSub.textContent = "Desconto válido somente em pagamentos via Pix";
    }
  }

  function syncFromPanel(){
    const carType  = document.getElementById("carType");
    const carBrand = document.getElementById("carBrand");
    const carModel = document.getElementById("carModel");
    const carYear  = document.getElementById("carYear");
    const colorInp = document.getElementById("selectedColor");

    st.tipo   = (carType?.value || st.tipo || "carro").trim() || "carro";
    st.marca  = (carBrand?.value || st.marca || "").trim();
    st.modelo = (carModel?.value || st.modelo || "").trim();
    st.ano    = (carYear?.value || st.ano || "").trim();
    st.cor    = safeColor((colorInp?.value || st.cor || "").trim());

    syncWindowKitState();
    updatePriceBlock();
  }

  function setSelectedLine(line){
    st.line = safeLine(line);
    renderLineButtons();
    renderKitCards();
    syncWindowKitState();
    updatePriceBlock();
  }

  function setSelectedKit(kit){
    st.kit = safeKit(kit);
    syncSelectedKitUI();
    syncWindowKitState();
    updatePriceBlock();
  }

  function openModal(){
    syncFromPanel();

    const product = currentProduct();
    const checkoutState = resolveCheckoutState();
    const rowKit = document.getElementById("sumKit")?.parentElement || null;
    const elLine = document.getElementById("sumLine");
    const elKit = document.getElementById("sumKit");
    const elType = document.getElementById("sumType");
    const elBrand = document.getElementById("sumBrand");
    const elModel = document.getElementById("sumModel");
    const elYear = document.getElementById("sumYear");
    const elColor = document.getElementById("sumColor");
    const elPrice = document.getElementById("sumPrice");

    if (window.nxSyncTexture) window.nxSyncTexture();

    if (rowKit) rowKit.style.display = "";
    if (elLine) elLine.textContent = LINE_LABELS[safeLine(st.line)] || "—";
    if (elKit) elKit.textContent = product.modalLabel;
    if (elType) elType.textContent = currentType() === "carro" ? "Carro" : (currentType() || "Carro");
    if (elBrand) elBrand.textContent = st.marca || "—";
    if (elModel) elModel.textContent = st.modelo || "—";
    if (elYear) elYear.textContent = st.ano || "—";
    if (elColor) elColor.textContent = st.cor || "—";
    if (elPrice) elPrice.textContent = fmtBRL(product.now);
    if (payBtn) payBtn.dataset.checkoutUrl = checkoutState.url;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    /* idem: chamada direta, o tempo do layout e tratado la dentro */
    if (window.nxUpdateModalHint) window.nxUpdateModalHint();
  }

  root.addEventListener("click", (e) => {
    const lineBtn = e.target.closest(".nkitLine");
    if (lineBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
      setSelectedLine(lineBtn.dataset.line);
      return;
    }

    const card = e.target.closest(".nkitCard");
    if (!card) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    setSelectedKit(card.dataset.kit);
  }, true);

  buyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    openModal();
  }, true);

  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  backBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  overlay?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest(".modal__overlay, #closeModal, #backToEdit, [data-close]")) {
      e.preventDefault();
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
      closeModal();
    }
  });

  payBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    handleCheckoutClick();
  }, true);

  ["change", "input"].forEach((evt) => {
    document.addEventListener(evt, (e) => {
      const id = e.target?.id;
      if (PANEL_IDS.includes(id)) syncFromPanel();
    });
  });

  setSelectedLine(st.line);
  setSelectedKit(st.kit);
  syncFromPanel();
});

document.addEventListener("DOMContentLoaded", () => {
  const stickyCta = document.getElementById("mobileStickyCta");
  const mainCta = document.getElementById("cta-produto");
  const modal = document.getElementById("confirmModal");
  const mobileQuery = window.matchMedia("(max-width: 820px)");

  if (!stickyCta || !mainCta) return;

  let nearMainCta = false;
  let pastHero = false;
  const heroEl = document.getElementById("top");

  function isModalOpen(){
    return !!modal && (
      modal.classList.contains("is-open")
      || modal.getAttribute("aria-hidden") === "false"
    );
  }

  function computeCtaVisibility(){
    const rect = mainCta.getBoundingClientRect();
    const safeTop = window.innerHeight * -0.12;
    const safeBottom = window.innerHeight * 1.3;
    nearMainCta = rect.top <= safeBottom && rect.bottom >= safeTop;
  }

  function shouldShowSticky(){
    return mobileQuery.matches
      && pastHero
      && !nearMainCta
      && !isModalOpen();
  }

  function renderSticky(){
    const visible = shouldShowSticky();
    stickyCta.classList.toggle("is-visible", visible);
    stickyCta.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  stickyCta.addEventListener("click", (e) => {
    e.preventDefault();
    mainCta.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if ("IntersectionObserver" in window){
    const ctaObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      nearMainCta = !!entry?.isIntersecting;
      renderSticky();
    }, {
      threshold: 0.01,
      rootMargin: "12% 0px 30% 0px"
    });

    ctaObserver.observe(mainCta);
  } else {
    const onScroll = () => {
      computeCtaVisibility();
      renderSticky();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  if (heroEl && "IntersectionObserver" in window){
    const heroObs = new IntersectionObserver((entries) => {
      pastHero = !entries[0].isIntersecting;
      renderSticky();
    }, { threshold: 0, rootMargin: "-45% 0px 0px 0px" });
    heroObs.observe(heroEl);
  } else {
    pastHero = true;
  }

  if (typeof mobileQuery.addEventListener === "function"){
    mobileQuery.addEventListener("change", renderSticky);
  } else if (typeof mobileQuery.addListener === "function"){
    mobileQuery.addListener(renderSticky);
  }

  if ("MutationObserver" in window){
    const stateObserver = new MutationObserver(renderSticky);
    if (modal) stateObserver.observe(modal, { attributes: true, attributeFilter: ["class", "aria-hidden"] });
  }

  computeCtaVisibility();
  renderSticky();
});

/* ===== INDICADOR DE PASSOS + ESPELHO DE PREÇO NO STICKY (design 2026) ===== */
(function initStepsAndStickyPrice(){
  const priceMain = document.querySelector("#ctaPrice .cta__priceMain");
  const stickyPrice = document.getElementById("stickyPrice");

  if (priceMain && stickyPrice){
    const sync = () => {
      const t = (priceMain.textContent || "").trim();
      if (t) stickyPrice.textContent = t;
    };
    sync();
    if ("MutationObserver" in window){
      new MutationObserver(sync).observe(priceMain, { childList:true, characterData:true, subtree:true });
    }
  }

  const stepbar = document.getElementById("stepbar");
  if (!stepbar) return;

  const steps = {
    veiculo: stepbar.querySelector('[data-step="veiculo"]'),
    kit:     stepbar.querySelector('[data-step="kit"]'),
    cor:     stepbar.querySelector('[data-step="cor"]')
  };
  const brand = document.getElementById("carBrand");
  const model = document.getElementById("carModel");
  const year  = document.getElementById("carYear");
  const colorInp = document.getElementById("selectedColor");

  const mark = (el, cls) => {
    if (!el) return;
    el.classList.remove("is-active", "is-done");
    if (cls) el.classList.add(cls);
  };

  function refresh(){
    const vehicleDone = !!(brand?.value && model?.value && year?.value);
    const kitDone = !!document.querySelector(".nkitCard.is-selected");
    const colorDone = !!colorInp?.value;

    mark(steps.veiculo, vehicleDone ? "is-done" : "is-active");
    mark(steps.kit,     kitDone ? "is-done" : (vehicleDone ? "is-active" : null));
    mark(steps.cor,     colorDone ? "is-done" : ((vehicleDone && kitDone) ? "is-active" : null));
  }

  ["change", "click"].forEach(evt => document.addEventListener(evt, refresh, true));
  refresh();
})();





/* =====================================================================
   ANTES E DEPOIS — comparador arrastável (HTML/CSS/JS vanilla)
===================================================================== */
(function initBeforeAfter(){
  const ba = document.getElementById("ba");
  if (!ba) return;

  const before = document.getElementById("baBefore");
  const beforeImg = document.getElementById("baBeforeImg");
  const afterImg = document.getElementById("baAfter");
  const handle = document.getElementById("baHandle");
  const pills = Array.from(document.querySelectorAll(".compare__pill"));
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const PAIRS = {
    interior: { before: "images/antes-interior.webp", after: "images/depois-interior.webp" },
    carpete:  { before: "images/antes-carpete.webp",  after: "images/depois-carpete.webp" }
  };

  let pos = 50;
  let userInteracted = false;
  let rafId = null;

  function setPos(p){
    pos = p < 0 ? 0 : (p > 100 ? 100 : p);
    before.style.clipPath = "inset(0 " + (100 - pos) + "% 0 0)";
    handle.style.left = pos + "%";
    ba.setAttribute("aria-valuenow", Math.round(pos));
  }

  function posFromClientX(clientX){
    const r = ba.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  }

  function stopIntro(){
    userInteracted = true;
    if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  }

  /* ---- Mouse (pointer events) ---- */
  let mouseDown = false;
  ba.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    stopIntro();
    mouseDown = true;
    try { ba.setPointerCapture(e.pointerId); } catch (_) {}
    setPos(posFromClientX(e.clientX));
    e.preventDefault();
  });
  ba.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !mouseDown) return;
    setPos(posFromClientX(e.clientX));
  });
  const endMouse = (e) => { if (!e || e.pointerType === "mouse") mouseDown = false; };
  ba.addEventListener("pointerup", endMouse);
  ba.addEventListener("pointercancel", endMouse);

  /* ---- Touch (decide vertical x horizontal para não sequestrar o scroll) ---- */
  let tStartX = 0, tStartY = 0, tDeciding = false, tDragging = false;
  ba.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    tStartX = t.clientX; tStartY = t.clientY;
    tDeciding = true; tDragging = false;
  }, { passive: true });
  ba.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (tDeciding){
      const dx = Math.abs(t.clientX - tStartX);
      const dy = Math.abs(t.clientY - tStartY);
      if (dx < 8 && dy < 8) return;
      tDeciding = false;
      if (dy > dx){ tDragging = false; return; }   // vertical -> deixa a página rolar
      tDragging = true;
      stopIntro();
    }
    if (!tDragging) return;
    e.preventDefault();                             // horizontal -> arrasta o comparador
    setPos(posFromClientX(t.clientX));
  }, { passive: false });
  const endTouch = () => { tDeciding = false; tDragging = false; };
  ba.addEventListener("touchend", endTouch);
  ba.addEventListener("touchcancel", endTouch);

  /* ---- Teclado (acessibilidade) ---- */
  ba.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight"){
      stopIntro();
      setPos(pos + (e.key === "ArrowLeft" ? -5 : 5));
      e.preventDefault();
    }
  });

  /* ---- Troca de par (pills) com fade ---- */
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      if (pill.classList.contains("is-active")) return;
      pills.forEach((p) => { p.classList.remove("is-active"); p.setAttribute("aria-pressed", "false"); });
      pill.classList.add("is-active");
      pill.setAttribute("aria-pressed", "true");

      const pair = PAIRS[pill.dataset.pair] || PAIRS.interior;
      ba.classList.add("is-fading");
      setTimeout(() => {
        beforeImg.src = pair.before;
        afterImg.src = pair.after;
        ba.classList.remove("is-fading");
      }, 200);
    });
  });

  /* ---- Animação de entrada: 50 -> 80 -> 30 -> 50 (~2.5s, uma vez) ---- */
  function runIntro(){
    if (userInteracted || reduceMotion) return;
    const keys = [[0, 50], [0.33, 80], [0.72, 30], [1, 50]];
    const dur = 2500;
    let start = null;
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    function frame(now){
      if (userInteracted) return;
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / dur);
      let i = 0;
      while (i < keys.length - 1 && p > keys[i + 1][0]) i++;
      const t0 = keys[i][0], v0 = keys[i][1];
      const j = Math.min(i + 1, keys.length - 1);
      const t1 = keys[j][0], v1 = keys[j][1];
      const segT = (t1 === t0) ? 1 : (p - t0) / (t1 - t0);
      setPos(v0 + (v1 - v0) * easeInOut(Math.min(1, Math.max(0, segT))));
      if (p < 1){ rafId = requestAnimationFrame(frame); }
      else { rafId = null; setPos(50); }
    }
    rafId = requestAnimationFrame(frame);
  }

  setPos(50);
  if (!reduceMotion && ("IntersectionObserver" in window)){
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting){
          io.disconnect();
          runIntro();
        }
      });
    }, { threshold: 0.5 });
    io.observe(ba);
  }
})();

/* ============================================================================
   ANCORAS SEM SUJAR A URL
   ---------------------------------------------------------------------------
   Os 6 links de ancora da pagina (#cta-produto, #top, #beneficios,
   #reviewsCarousel, #faq) escreviam o fragmento no endereco ao serem
   clicados: /tapete-bandeja virava /tapete-bandeja#cta-produto. Isso suja o
   link que a pessoa copia e compartilha, e polui o relatorio de trafego, que
   passa a listar a mesma pagina em varias linhas.

   O href continua no HTML de proposito: sem JS o link ainda funciona, e o
   leitor de tela continua anunciando como link de secao.

   O scroll nao e feito na mao. scrollIntoView respeita o scroll-padding-top
   de 84px e o scroll-behavior: smooth que ja estao no :root — refazer isso em
   JS so criaria um segundo comportamento para manter em sincronia.
   ========================================================================== */
(function ancorasSemFragmento(){
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;

    var href = a.getAttribute("href");
    if (!href || href === "#") return;

    var alvo = document.getElementById(href.slice(1));
    if (!alvo) return;                      /* ancora quebrada: deixa o navegador lidar */

    e.preventDefault();
    alvo.scrollIntoView();

    /* Sem o fragmento, o teclado ficaria preso no topo da pagina. Dar foco ao
       destino mantem a navegacao por Tab no lugar certo; o tabindex temporario
       existe porque secao nao e focavel por natureza. */
    if (!alvo.hasAttribute("tabindex")) {
      alvo.setAttribute("tabindex", "-1");
      alvo.addEventListener("blur", function limpar(){
        alvo.removeAttribute("tabindex");
        alvo.removeEventListener("blur", limpar);
      });
    }
    alvo.focus({ preventScroll: true });
  });
})();

/* ============================================================================
   EVENTOS DO TIKTOK NA LP — ViewContent e AddToCart
   ---------------------------------------------------------------------------
   O checkout ja disparava InitiateCheckout, AddPaymentInfo e CompletePayment,
   mas a LP nao disparava nada: o funil comecava so quando a pessoa chegava no
   checkout. Sem estes dois, o TikTok nao sabe quem viu o produto e nao
   avancou, nem quem montou o kit e desistiu — que e o publico de remarketing
   mais barato e o sinal que o algoritmo usa para achar comprador parecido.

   ViewContent  ao carregar a pagina, com o produto e o preco em tela.
   AddToCart    quando o modal de revisao abre. E o momento em que a pessoa
                escolheu veiculo, cor e kit e confirmou — o equivalente a por
                no carrinho nesta loja, ja que nao existe carrinho antes disso.

   O item e montado no MESMO formato que o checkout usa (id, name, price,
   color, size, qty), para o content_id bater entre os eventos da LP e os do
   checkout. Se divergir, o TikTok trata como produtos diferentes e o funil
   nao fecha.
   ========================================================================== */
(function eventosDaLP(){
  var api = window.GdcTikTok;
  if (!api) return;                        /* pixel fora do ar: nada a fazer */

  /** Le o preco que esta na tela, que e o que o cliente esta vendo. */
  function precoAtual(){
    var el = document.querySelector("#ctaPrice .cta__priceMain, .cta__priceMain");
    if (!el) return 0;
    var t = (el.textContent || "").replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
    return Number(t) || 0;
  }

  function itemAtual(){
    var v = window.__vehicleState || {};
    var k = window.__kitState || {};
    var veiculo = [v.marca, v.modelo, v.ano].filter(Boolean).join(" ");
    return [{
      id:    "tapetes-automotivos-sob-medida",
      name:  k.label || "Tapetes Automotivos Sob Medida",
      price: precoAtual(),
      color: v.cor || "",
      size:  veiculo || "Sob medida",
      qty:   1
    }];
  }

  function assinatura(item){
    return [item.id, item.name, item.color, item.size, item.price].join("|");
  }

  function disparar(evento){
    var itens = itemAtual();
    api.track(evento, api.contentsFrom(itens, itens[0].price));
    return assinatura(itens[0]);
  }

  /* ViewContent: uma vez, quando a pagina termina de montar. Antes disso o
     preco e o rotulo do kit ainda nao existem no DOM. */
  function aoCarregar(){ disparar("ViewContent"); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aoCarregar);
  } else {
    aoCarregar();
  }

  /* AddToCart: quando o modal abre. Observo o atributo em vez de embrulhar
     openModal porque existem DUAS funcoes com esse nome no arquivo, e so uma
     esta ativa — observar o resultado funciona nos dois casos.
     O disparo e uma vez por sessao de modal: reabrir sem mudar nada nao conta
     como novo carrinho. */
  var modal = document.getElementById("confirmModal");
  if (!modal) return;

  var estavaAberto = false;
  var ultimaAssinatura = null;

  new MutationObserver(function(){
    var aberto = modal.getAttribute("aria-hidden") === "false"
              || modal.classList.contains("is-open");

    if (aberto && !estavaAberto) {
      /* Fechar e reabrir sem trocar nada nao e um carrinho novo. So dispara
         quando a configuracao mudou de fato — outro kit, outra cor, outro
         veiculo ou outro preco. */
      /* itemAtual() devolve um ARRAY, no formato que contentsFrom espera.
         A assinatura e do produto, entao vai o primeiro item — passar o array
         inteiro fazia todos os campos virarem undefined e a assinatura ficava
         "||||" sempre igual, o que travava o evento depois da primeira vez. */
      var atual = assinatura(itemAtual()[0]);
      if (atual !== ultimaAssinatura) {
        disparar("AddToCart");
        ultimaAssinatura = atual;
      }
    }
    estavaAberto = aberto;
  }).observe(modal, { attributes: true, attributeFilter: ["aria-hidden", "class"] });
})();


/* =========================================================
   BUSCA DE MODELO + "NÃO ENCONTREI MEU MODELO"
   Tudo alimenta os selects #carBrand/#carModel/#carYear —
   modal, carrinho e checkout continuam lendo o mesmo lugar.
========================================================= */
(function buscaEModeloLivre(){
  const OPT_BRAND = "__outra_marca__";
  const OPT_MODEL = "__outro_modelo__";

  const search   = document.getElementById("carSearch");
  const listBox  = document.getElementById("vsearchList");
  const brandSel = document.getElementById("carBrand");
  const modelSel = document.getElementById("carModel");
  const yearSel  = document.getElementById("carYear");
  const gBrand   = document.getElementById("customBrandGroup");
  const gModel   = document.getElementById("customModelGroup");
  const inBrand  = document.getElementById("carBrandCustom");
  const inModel  = document.getElementById("carModelCustom");
  if (!brandSel || !modelSel || !yearSel || !gModel) return;

  const db = () => window.__carDB || {};

  /* ---------- índice de busca (marca + modelo, sem acento) ---------- */
  const semAcento = (s) => String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  let indice = null;
  function getIndice(){
    if (indice) return indice;
    indice = [];
    const base = db();
    Object.keys(base).forEach((marca) => {
      Object.keys(base[marca]).forEach((modelo) => {
        indice.push({ marca, modelo, chave: semAcento(marca + " " + modelo) });
      });
    });
    return indice;
  }

  function buscar(termo){
    const partes = semAcento(termo).split(/\s+/).filter(Boolean);
    if (!partes.length) return [];
    return getIndice()
      .filter((it) => partes.every((p) => it.chave.includes(p)))
      .slice(0, 8);
  }

  /* ---------- opções extras nos selects ---------- */
  function garantirOpcao(select, valor, texto){
    if (select.querySelector('option[value="' + valor + '"]')) return;
    const opt = document.createElement("option");
    opt.value = valor;
    opt.textContent = texto;
    select.appendChild(opt);
  }

  function acharOpcaoCustom(select, valorEspecial){
    return select.querySelector('option[data-custom="' + valorEspecial + '"]') ||
           select.querySelector('option[value="' + valorEspecial + '"]');
  }

  function reforcarOpcoes(){
    if (brandSel.options.length > 1 || !brandSel.disabled){
      garantirOpcao(brandSel, OPT_BRAND, "✚ Outra marca (digitar)");
    }
    if (!modelSel.disabled){
      garantirOpcao(modelSel, OPT_MODEL, "🔍 Não encontrei meu modelo (digitar)");
    }
  }

  /* selects são repovoados pelo fluxo original; recolocamos as opções depois.
     Observer com guarda: appendChild dentro do callback dispara o proprio
     observer de novo, mas garantirOpcao ja existe -> retorna cedo, sem loop. */
  new MutationObserver(reforcarOpcoes).observe(brandSel, { childList: true });
  new MutationObserver(reforcarOpcoes).observe(modelSel, { childList: true });
  reforcarOpcoes();

  /* ---------- anos genéricos p/ modelo digitado ---------- */
  function anosGenericos(){
    const atual = new Date().getFullYear() + 1;
    yearSel.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = ""; ph.textContent = "Selecione o ano";
    yearSel.appendChild(ph);
    for (let a = atual; a >= 1960; a--){
      const o = document.createElement("option");
      o.value = String(a); o.textContent = String(a);
      yearSel.appendChild(o);
    }
    yearSel.disabled = false;
  }

  /* ---------- modo digitado ---------- */
  function aplicarTextoNoSelect(select, valorEspecial, texto){
    const opt = acharOpcaoCustom(select, valorEspecial);
    if (!opt) return;
    const limpo = String(texto || "").trim();
    if (limpo){
      opt.value = limpo;
      opt.textContent = limpo;
      opt.dataset.custom = valorEspecial;
      select.value = limpo;
    }
  }

  function prepararModeloLivre(){
    modelSel.innerHTML = "";
    garantirOpcao(modelSel, OPT_MODEL, "🔍 Não encontrei meu modelo (digitar)");
    modelSel.disabled = false;
    const optM = acharOpcaoCustom(modelSel, OPT_MODEL);
    const digitado = inModel ? inModel.value.trim() : "";
    if (digitado){
      optM.value = digitado;
      optM.textContent = digitado;
      optM.dataset.custom = OPT_MODEL;
    }
    modelSel.value = optM.value;
    gModel.hidden = false;
    anosGenericos();
  }

  brandSel.addEventListener("change", () => {
    if (brandSel.value === OPT_BRAND){
      gBrand.hidden = false;
      prepararModeloLivre();
      if (inBrand && !inBrand.value) inBrand.focus();
    } else if (!(acharOpcaoCustom(brandSel, OPT_BRAND) || {}).selected){
      gBrand.hidden = true;
      gModel.hidden = true;
    }
  });

  modelSel.addEventListener("change", () => {
    if (modelSel.value === OPT_MODEL){
      gModel.hidden = false;
      anosGenericos();
      if (inModel && !inModel.value) inModel.focus();
    } else if (!(acharOpcaoCustom(modelSel, OPT_MODEL) || {}).selected){
      gModel.hidden = true;
    }
  });

  let tBrand, tModel;
  inBrand?.addEventListener("input", () => {
    clearTimeout(tBrand);
    tBrand = setTimeout(() => {
      const anoAntes = yearSel.value;
      aplicarTextoNoSelect(brandSel, OPT_BRAND, inBrand.value);
      brandSel.dispatchEvent(new Event("change", { bubbles: true }));
      /* o fluxo original zera modelo/ano ao trocar a marca; restauramos */
      prepararModeloLivre();
      if (anoAntes) yearSel.value = anoAntes;
    }, 350);
  });

  inModel?.addEventListener("input", () => {
    clearTimeout(tModel);
    tModel = setTimeout(() => {
      const anoAntes = yearSel.value;
      aplicarTextoNoSelect(modelSel, OPT_MODEL, inModel.value);
      modelSel.dispatchEvent(new Event("change", { bubbles: true }));
      /* o fluxo original zera o ano ao trocar o modelo; devolvemos */
      anosGenericos();
      if (anoAntes) yearSel.value = anoAntes;
      gModel.hidden = false;
    }, 350);
  });

  /* ---------- autocompletar ---------- */
  if (!search || !listBox) return;

  function fecharLista(){ listBox.hidden = true; listBox.innerHTML = ""; }

  function escolher(marca, modelo){
    fecharLista();
    search.value = marca + " " + modelo;
    gBrand.hidden = true; gModel.hidden = true;
    brandSel.value = marca;
    brandSel.dispatchEvent(new Event("change", { bubbles: true }));
    modelSel.value = modelo;
    modelSel.dispatchEvent(new Event("change", { bubbles: true }));
    yearSel.focus();
  }

  function renderLista(termo){
    const achados = buscar(termo);
    listBox.innerHTML = "";
    achados.forEach(({ marca, modelo }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vsearch__item";
      const forte = document.createElement("strong");
      forte.textContent = modelo;
      const span = document.createElement("span");
      span.textContent = marca;
      b.appendChild(forte);
      b.appendChild(span);
      b.addEventListener("click", () => escolher(marca, modelo));
      listBox.appendChild(b);
    });
    const rodape = document.createElement("button");
    rodape.type = "button";
    rodape.className = "vsearch__item vsearch__item--free";
    rodape.textContent = achados.length
      ? "Não é nenhum desses? Toque para digitar seu modelo"
      : "Modelo não encontrado — toque para digitar (fazemos sob medida ✅)";
    rodape.addEventListener("click", () => {
      const termoDigitado = search.value.trim();
      fecharLista();
      garantirOpcao(brandSel, OPT_BRAND, "✚ Outra marca (digitar)");
      brandSel.disabled = false;
      brandSel.value = OPT_BRAND;
      brandSel.dispatchEvent(new Event("change", { bubbles: true }));
      if (inModel && termoDigitado && !inModel.value){
        inModel.value = termoDigitado;
        inModel.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    listBox.appendChild(rodape);
    listBox.hidden = false;
  }

  let tBusca;
  search.addEventListener("input", () => {
    clearTimeout(tBusca);
    const termo = search.value;
    if (!termo.trim()){ fecharLista(); return; }
    tBusca = setTimeout(() => renderLista(termo), 150);
  });

  search.addEventListener("focus", () => {
    if (search.value.trim()) renderLista(search.value);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#vsearchGroup")) fecharLista();
  });
})();
