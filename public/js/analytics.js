/**
 * Tapecar — client analytics (MVP)
 * Persists funnel events in localStorage; shape ready for a future events API.
 *
 * Future hooks (do not ship secrets in static files):
 * - GA4 Measurement Protocol: POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXX&api_secret=...
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "tapecar-analytics-v1";
  // v3: prefer IPv4 lookups (TIM IPv6 often maps to carrier hubs e.g. Lages-SC)
  const GEO_CACHE_KEY = "tapecar-geo-cache-v3";
  const MAX_EVENTS = 2000;
  const GEO_TTL_MS = 2 * 60 * 60 * 1000;

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function uid() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function deviceType() {
    return global.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
  }

  function readUtm() {
    const params = new URLSearchParams(global.location.search);
    const keys = ["src", "sck", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const utm = {};
    let has = false;
    keys.forEach((k) => {
      const v = params.get(k);
      if (v) {
        utm[k.replace("utm_", "")] = v;
        has = true;
      }
    });
    if (has) {
      try {
        sessionStorage.setItem("tapecar-utm-v1", JSON.stringify(utm));
        sessionStorage.setItem(
          "tapecar-utmify-v1",
          JSON.stringify({
            src: params.get("src") || null,
            sck: params.get("sck") || null,
            utm_source: params.get("utm_source") || null,
            utm_campaign: params.get("utm_campaign") || null,
            utm_medium: params.get("utm_medium") || null,
            utm_content: params.get("utm_content") || null,
            utm_term: params.get("utm_term") || null,
          })
        );
      } catch {
        /* ignore */
      }
      return utm;
    }
    try {
      return safeParse(sessionStorage.getItem("tapecar-utm-v1") || "{}", {});
    } catch {
      return {};
    }
  }

  function loadStore() {
    const data = safeParse(localStorage.getItem(STORAGE_KEY) || "null", null);
    if (data && Array.isArray(data.events)) return data;
    return { version: 1, events: [] };
  }

  function saveStore(store) {
    if (store.events.length > MAX_EVENTS) {
      store.events = store.events.slice(-MAX_EVENTS);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      store.events = store.events.slice(-Math.floor(MAX_EVENTS / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch {
        /* quota exhausted */
      }
    }
  }

  function getCachedGeo() {
    const cached = safeParse(sessionStorage.getItem(GEO_CACHE_KEY) || "null", null);
    if (cached && cached.ts && Date.now() - cached.ts < GEO_TTL_MS) return cached;
    return null;
  }

  function setCachedGeo(geo) {
    try {
      sessionStorage.setItem(
        GEO_CACHE_KEY,
        JSON.stringify({ ...geo, ts: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function stripAccents(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizeCityKey(city) {
    return stripAccents(city)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
  }

  function regionToUf(region) {
    const raw = String(region || "").trim();
    if (!raw) return "";
    if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
    const map = {
      acre: "AC",
      alagoas: "AL",
      amapa: "AP",
      amazonas: "AM",
      bahia: "BA",
      ceara: "CE",
      "distrito federal": "DF",
      "espirito santo": "ES",
      goias: "GO",
      maranhao: "MA",
      "mato grosso": "MT",
      "mato grosso do sul": "MS",
      "minas gerais": "MG",
      para: "PA",
      paraiba: "PB",
      parana: "PR",
      pernambuco: "PE",
      piaui: "PI",
      "rio de janeiro": "RJ",
      "rio grande do norte": "RN",
      "rio grande do sul": "RS",
      rondonia: "RO",
      roraima: "RR",
      "santa catarina": "SC",
      "sao paulo": "SP",
      sergipe: "SE",
      tocantins: "TO",
    };
    return map[normalizeCityKey(raw)] || "";
  }

  function buildGeoLabel(city, region) {
    const name = String(city || "").trim();
    if (!name) return "";
    const uf = regionToUf(region);
    return uf ? `${name} - ${uf}` : name;
  }

  function isIPv4(ip) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(ip || "").trim());
  }

  function isIPv6(ip) {
    return String(ip || "").includes(":");
  }

  const GEO_PROVIDERS = [
    {
      // Prefer explicit IP when we have a stable IPv4 (avoids TIM IPv6 carrier hubs)
      urlFor(ip) {
        if (ip && isIPv4(ip)) return `https://ipwho.is/${encodeURIComponent(ip)}`;
        return "https://ipwho.is/";
      },
      parse(data) {
        if (!data || data.success === false || !data.city) return null;
        return {
          ip: data.ip || "",
          city: data.city || "",
          region: data.region_code || data.region || "",
          country: data.country_code || "",
        };
      },
    },
    {
      urlFor(ip) {
        if (ip && isIPv4(ip)) {
          return `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`;
        }
        return "https://get.geojs.io/v1/ip/geo.json";
      },
      parse(data) {
        if (!data?.city) return null;
        return {
          ip: data.ip || "",
          city: data.city || "",
          region: data.region || "",
          country: data.country_code || "",
        };
      },
    },
    {
      urlFor() {
        return "https://wtfismyip.com/json";
      },
      parse(data) {
        const city = data?.YourFuckingCity;
        if (!city) return null;
        const loc = String(data.YourFuckingLocation || "");
        const ufMatch = loc.match(/,\s*([A-Z]{2})\s*,/);
        return {
          ip: data.YourFuckingIPAddress || "",
          city,
          region: ufMatch?.[1] || "",
          country: "BR",
        };
      },
    },
  ];

  async function detectPublicIPv4() {
    // Forces IPv4 path when the dual-stack connection would otherwise use IPv6.
    try {
      const data = await fetchJson("https://api.ipify.org?format=json");
      const ip = String(data?.ip || "").trim();
      return isIPv4(ip) ? ip : "";
    } catch {
      return "";
    }
  }

  /**
   * Prefer IPv4 geolocation (BR mobile IPv6 often maps to carrier hubs like Lages-SC).
   * Personalize only with a trusted IPv4 hit or 2+ providers agreeing on a non-IPv6-only city.
   */
  function pickGeo(results, ipv4) {
    const empty = { ip: ipv4 || "", city: "", region: "", country: "", label: "" };
    if (!results.length) return empty;

    const fromResult = (samples, source, consensus) => {
      const withUf = samples.find((s) => regionToUf(s.region)) || samples[0];
      const city = withUf.city;
      const region = regionToUf(withUf.region) || withUf.region || "";
      return {
        ip: ipv4 || withUf.ip || "",
        city,
        region,
        country: withUf.country || "BR",
        label: buildGeoLabel(city, region),
        source,
        consensus,
      };
    };

    const topCity = (rows) => {
      const counts = new Map();
      for (const row of rows) {
        const key = normalizeCityKey(row.city);
        if (!key) continue;
        const bucket = counts.get(key) || { count: 0, samples: [] };
        bucket.count += 1;
        bucket.samples.push(row);
        counts.set(key, bucket);
      }
      let best = null;
      for (const bucket of counts.values()) {
        if (!best || bucket.count > best.count) best = bucket;
      }
      return best;
    };

    // Prefer anything tied to the detected public IPv4
    const ipv4Pool = results.filter((row) => isIPv4(row.ip) || (ipv4 && row.ip === ipv4));
    if (ipv4 && ipv4Pool.length) {
      const best = topCity(ipv4Pool);
      if (best) return fromResult(best.samples, "ipv4", best.count);
    }

    // No reliable IPv4 city: require multi-provider consensus and reject IPv6-only agreement
    const best = topCity(results);
    if (!best || best.count < 2) {
      return { ...empty, ip: ipv4 || results.find((r) => r.ip)?.ip || "" };
    }
    if (best.samples.every((s) => isIPv6(s.ip))) {
      return { ...empty, ip: best.samples[0].ip || ipv4 || "" };
    }
    return fromResult(best.samples, "consensus", best.count);
  }

  async function resolveGeo({ force = false } = {}) {
    if (!force) {
      const cached = getCachedGeo();
      // Cache hit even when label is empty (known "use todo o Brasil")
      if (cached && Object.prototype.hasOwnProperty.call(cached, "label")) return cached;
    }

    const ipv4 = await detectPublicIPv4();

    const settled = await Promise.all(
      GEO_PROVIDERS.map(async (provider) => {
        try {
          const url = provider.urlFor(ipv4);
          const data = await fetchJson(url);
          const parsed = provider.parse(data);
          if (!parsed) return null;
          if (ipv4 && url.includes(ipv4)) {
            return { ...parsed, ip: isIPv4(parsed.ip) ? parsed.ip : ipv4 };
          }
          return parsed;
        } catch {
          return null;
        }
      })
    );
    const results = settled.filter(Boolean);
    const geo = pickGeo(results, ipv4);
    setCachedGeo(geo);
    return geo;
  }

  /**
   * @param {string} name
   * @param {Record<string, unknown>} [props]
   */
  function track(name, props = {}) {
    const geo = getCachedGeo() || { city: "", region: "", country: "", label: "" };
    const event = {
      id: uid(),
      name,
      ts: Date.now(),
      page: global.location.pathname.split("/").pop() || "index.html",
      referrer: document.referrer || "",
      utm: readUtm(),
      geo: {
        ip: geo.ip || "",
        city: geo.city || "",
        region: geo.region || "",
        country: geo.country || "",
        label: geo.label || "",
      },
      device: deviceType(),
      product: props.product || null,
      qty: props.qty ?? null,
      value: props.value ?? null,
      step: props.step ?? null,
      method: props.method ?? null,
      meta: props.meta || null,
    };

    const store = loadStore();
    store.events.push(event);
    saveStore(store);


    global.dispatchEvent(new CustomEvent("tapecar:analytics", { detail: event }));
    return event;
  }

  function getEvents() {
    return loadStore().events.slice();
  }

  function clearEvents() {
    saveStore({ version: 1, events: [] });
  }

  function exportJson() {
    return JSON.stringify(loadStore(), null, 2);
  }

  function setEvents(events) {
    saveStore({ version: 1, events: Array.isArray(events) ? events.slice(-MAX_EVENTS) : [] });
  }

  /**
   * Payload shape for a future backend:
   * POST /api/events { events: Event[] }
   */
  function buildApiPayload(events) {
    return {
      source: "tapecar",
      sentAt: new Date().toISOString(),
      events: events || getEvents(),
    };
  }

  // Warm geo + capture UTM early
  readUtm();
  resolveGeo().catch(() => {});

  const api = {
    STORAGE_KEY,
    MAX_EVENTS,
    track,
    getEvents,
    clearEvents,
    exportJson,
    setEvents,
    buildApiPayload,
    resolveGeo,
    getCachedGeo,
    setCachedGeo,
  };

  global.TapecarAnalytics = api;
})(typeof window !== "undefined" ? window : globalThis);
