const ORDER_KEY = "tapecar-order-v1";
const PIX_ORDER_KEY = "tapecar-pix-order-v1";
const PIX_TIMER_KEY = "tapecar-pix-expires-v1";
const TIMER_SECONDS = 30 * 60;
const POLL_MS = 3500;

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const iconCopy = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const iconCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const iconPhone = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="2"/><path d="M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const iconScan = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

const els = {
  page: document.getElementById("pix-page"),
  empty: document.getElementById("pix-empty"),
  timer: document.getElementById("pix-timer"),
  amount: document.getElementById("pix-amount"),
  codeInput: document.getElementById("pix-code-input"),
  copyBtn: document.getElementById("copy-pix-btn"),
  copyText: document.getElementById("copy-pix-text"),
  copyLabel: document.getElementById("copy-pix-label"),
  payHint: document.getElementById("pix-pay-hint"),
  copyMode: document.getElementById("pix-copy-mode"),
  qrMode: document.getElementById("pix-qr-mode"),
  qrImg: document.getElementById("pix-qr-img"),
  howto: document.getElementById("pix-howto-list"),
  toggle: document.getElementById("pix-mode-toggle"),
  toggleLabel: document.getElementById("pix-toggle-label"),
  statusHint: document.getElementById("pix-status-hint"),
};

let copyState = "default";
let copyResetTimer = null;
let pollTimer = null;
/** true = copia e cola (default on mobile) */
let copyPasteMode = window.matchMedia("(max-width: 767px)").matches;

function loadOrder() {
  try {
    return JSON.parse(sessionStorage.getItem(PIX_ORDER_KEY) || "null");
  } catch {
    return null;
  }
}

function formatSecondsToTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds | 0);
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getRemainingSeconds() {
  const raw = sessionStorage.getItem(PIX_TIMER_KEY);
  let expiresAt = raw ? Number(raw) : NaN;
  if (!Number.isFinite(expiresAt)) {
    expiresAt = Date.now() + TIMER_SECONDS * 1000;
    sessionStorage.setItem(PIX_TIMER_KEY, String(expiresAt));
  }
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

function startTimer() {
  const tick = () => {
    const left = getRemainingSeconds();
    els.timer.textContent = formatSecondsToTime(left);
    if (left <= 0) {
      els.timer.textContent = "0:00";
      if (els.statusHint) {
        els.statusHint.textContent = "Código expirado. Volte ao checkout e gere um novo Pix.";
      }
    }
  };
  tick();
  setInterval(tick, 1000);
}

function resolvePixCode(order) {
  return order?.pixCode || null;
}

function qrImageUrl(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    payload
  )}`;
}

function setCopyLabel() {
  if (copyState === "copied") {
    els.copyLabel.innerHTML = `${iconCheck}<span id="copy-pix-text">Código PIX copiado!</span>`;
    els.copyText = document.getElementById("copy-pix-text");
    return;
  }
  if (copyState === "again") {
    els.copyLabel.innerHTML = `${iconCopy}<span id="copy-pix-text">Copiar código novamente</span>`;
    els.copyText = document.getElementById("copy-pix-text");
    return;
  }
  els.copyLabel.innerHTML = `${iconCopy}<span id="copy-pix-text">Copiar código</span>`;
  els.copyText = document.getElementById("copy-pix-text");
}

async function copyPixCode() {
  const value = els.codeInput.value;
  try {
    await navigator.clipboard.writeText(value);
    copyState = "copied";
    setCopyLabel();
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copyState = "again";
      setCopyLabel();
    }, 4000);
  } catch {
    els.codeInput.select();
    copyState = "default";
    setCopyLabel();
    els.copyText.textContent = "Selecione e copie";
  }
}

function renderHowto() {
  if (copyPasteMode) {
    els.howto.innerHTML = `
      <li>
        ${iconCheck}
        <p><strong>Copie o código</strong> acima clicando no botão</p>
      </li>
      <li>
        ${iconPhone}
        <p>Abra o aplicativo de seu banco e selecione <strong>Copia e Cola</strong> na opção de <strong>pagamento por PIX</strong>. Certifique-se que os dados estão corretos e finalize o pagamento.</p>
      </li>`;
    return;
  }
  els.howto.innerHTML = `
    <li>
      ${iconPhone}
      <p>Abra o aplicativo de seu banco e selecione <strong>QR Code</strong> na opção de <strong>pagamento por PIX.</strong></p>
    </li>
    <li>
      ${iconScan}
      <p>Utilize a câmera do celular para <strong>escanear o QR Code</strong>. Certifique-se que os dados estão corretos e finalize o pagamento.</p>
    </li>`;
}

function renderMode() {
  els.copyMode.hidden = !copyPasteMode;
  els.qrMode.hidden = copyPasteMode;

  if (copyPasteMode) {
    els.payHint.innerHTML = `Pague através do codigo <strong>PIX Copia e Cola</strong>`;
    els.toggleLabel.textContent = "MOSTRAR QR CODE";
  } else {
    els.payHint.innerHTML = `Efetue o pagamento agora mesmo <strong>escaneando o QR Code</strong>`;
    els.toggleLabel.textContent = "UTILIZAR PIX COPIA E COLA";
  }
  renderHowto();
}

function showEmpty() {
  els.page.hidden = true;
  els.empty.hidden = false;
}

function showPaid(order) {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // Pix confirmado pelo gateway: aqui sim a venda existe.
  const tiktok = window.GdcTikTok;
  if (tiktok) {
    tiktok.identify({
      email: order.email || order.customer?.email,
      phone: order.customer?.phone,
      cpf: order.customer?.cpf,
    });
    tiktok.track(
      "CompletePayment",
      tiktok.contentsFrom(order.items, order.total),
      tiktok.eventId("CompletePayment", order.transactionId)
    );
  }

  els.page.hidden = true;
  els.empty.hidden = true;

  const id = order.orderId || order.transactionId || "";
  try {
    sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({
        orderId: id,
        total: order.total,
        method: "pix",
        email: order.email || order.customer?.email || "",
        status: "paid",
      })
    );
  } catch {
    /* a pagina de obrigado cai no numero do pedido da query string */
  }
  window.TapecarAnalytics?.track?.("order_complete", {
    value: order.total,
    qty: Array.isArray(order.items)
      ? order.items.reduce((s, i) => s + (i.qty || 0), 0)
      : 1,
    product: order.items?.[0]
      ? { id: order.items[0].id, name: order.items[0].name, price: order.items[0].price }
      : null,
    items: Array.isArray(order.items)
      ? order.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
        }))
      : null,
    method: "pix",
    meta: {
      orderId: order.orderId,
      transactionId: order.transactionId,
      userData: {
        email: order.email || order.customer?.email || "",
        phone: order.customer?.phone || "",
        cpf: order.customer?.cpf || "",
        fullName: order.fullName || order.customer?.name || "",
        city: order.customer?.address?.city || "",
        state: order.customer?.address?.state || "",
        zipcode: order.customer?.address?.zipcode || "",
        country: "br",
      },
    },
  });

  window.location.href = `/obrigado?pedido=${encodeURIComponent(id)}`;
}

function startStatusPolling(order) {
  const id = order.transactionId;
  if (!id) return;

  const check = async () => {
    try {
      const res = await fetch(`/api/payment/status?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) return;
      const status = String(data.status || "").toLowerCase();
      if (status === "paid" || status === "authorized") {
        showPaid(order);
      } else if (els.statusHint) {
        els.statusHint.textContent = "Aguardando confirmação do pagamento…";
      }
    } catch {
      /* ignore transient errors */
    }
  };

  check();
  pollTimer = setInterval(check, POLL_MS);
}

function init() {
  const year = document.getElementById("pix-year");
  if (year) year.textContent = String(new Date().getFullYear());

  const order = loadOrder();
  if (!order || !order.total) {
    showEmpty();
    return;
  }

  const payload = resolvePixCode(order);
  if (!payload) {
    showEmpty();
    return;
  }

  if (order.expiresAt) {
    sessionStorage.setItem(PIX_TIMER_KEY, String(order.expiresAt));
  }

  els.amount.textContent = money(order.total);
  els.codeInput.value = payload;
  els.qrImg.src = qrImageUrl(payload);
  els.qrImg.onerror = () => {
    const fallback = document.createElement("div");
    fallback.className = "pix-qr pix-qr-fallback";
    fallback.setAttribute("role", "img");
    fallback.setAttribute("aria-label", "QR Code placeholder");
    fallback.style.cssText =
      "width:200px;height:200px;background:repeating-linear-gradient(0deg,#111 0 2px,transparent 2px 6px),repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 6px);background-size:12px 12px;border:1px solid #e5e7eb;border-radius:0.35rem;";
    els.qrImg.replaceWith(fallback);
  };

  els.copyBtn.addEventListener("click", copyPixCode);
  els.toggle.addEventListener("click", () => {
    copyPasteMode = !copyPasteMode;
    renderMode();
  });

  renderMode();
  setCopyLabel();
  startTimer();
  startStatusPolling(order);

  window.TapecarAnalytics?.track?.("page_view", {
    meta: { page: "pix.html" },
  });

  // Evita Purchase/AddPaymentInfo duplicados se já disparou no checkout antes do redirect.
  const pixMetaKey = "tapecar-pix-generated-meta-v1";
  let alreadySent = false;
  try {
    const marked = sessionStorage.getItem(pixMetaKey) || "";
    alreadySent = Boolean(
      marked &&
        (marked === String(order.orderId || "") || marked === String(order.transactionId || ""))
    );
    if (alreadySent) sessionStorage.removeItem(pixMetaKey);
  } catch {
    /* ignore */
  }

  if (!alreadySent) {
    window.TapecarAnalytics?.track?.("pix_generated", {
      value: order.total,
      qty: Array.isArray(order.items)
        ? order.items.reduce((s, i) => s + (i.qty || 0), 0)
        : 1,
      product: order.items?.[0]
        ? { id: order.items[0].id, name: order.items[0].name, price: order.items[0].price }
        : null,
      items: Array.isArray(order.items)
        ? order.items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
          }))
        : null,
      method: "pix",
      meta: {
        orderId: order.orderId,
        transactionId: order.transactionId,
        page: "pix.html",
        userData: {
          email: order.email || order.customer?.email || "",
          phone: order.customer?.phone || "",
          cpf: order.customer?.cpf || "",
          fullName: order.fullName || order.customer?.name || "",
          city: order.customer?.address?.city || "",
          state: order.customer?.address?.state || "",
          zipcode: order.customer?.address?.zipcode || "",
          country: "br",
        },
      },
    });
  }
}

init();
