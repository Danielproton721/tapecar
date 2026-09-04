const CART_KEY = "tapecar-cart-v1";
const CHECKOUT_DRAFT_KEY = "tapecar-checkout-draft-v1";
const ABANDON_ELIGIBLE_KEY = "tapecar-abandon-eligible-v1";
const ABANDON_SENT_KEY = "tapecar-abandon-sent-v1";
const ABANDON_CONVERTED_KEY = "tapecar-abandon-converted-v1";
const PIX_DISCOUNT_PERCENT = 5;

const money = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Prazo do frete gratis. Aparece no seletor de entrega, no card de
    beneficio do checkout e na politica de entrega — os tres tem que bater. */
const FREE_SHIPPING_BUSINESS_DAYS = { min: 8, max: 9 };

const shippingMethods = [
  {
    id: "correios-free",
    title: "Frete Grátis",
    turnaround: `${FREE_SHIPPING_BUSINESS_DAYS.min} a ${FREE_SHIPPING_BUSINESS_DAYS.max} dias úteis`,
    price: 0,
    icon: "assets/carriers/correios.svg",
    iconAlt: "Correios",
    iconWidth: 75,
    iconHeight: 24,
  },
  {
    id: "sedex",
    title: "SEDEX",
    turnaround: "4 a 5 dias úteis",
    price: 34.54,
    icon: "assets/carriers/correios.svg",
    iconAlt: "Correios",
    iconWidth: 75,
    iconHeight: 24,
  },
  {
    id: "full",
    title: "FULL",
    turnaround: "1 a 3 dias úteis",
    price: 53.32,
    icon: "assets/carriers/full.svg",
    iconAlt: "Full",
    iconWidth: 62,
    iconHeight: 18,
  },
];

const state = {
  step: 1,
  /** Within step 2: "address" (fill CEP/address) then "shipping" (choose frete). */
  deliveryPhase: "address",
  cart: loadCart(),
  shippingId: null,
  paymentMethod: "PIX",
  form: loadDraft(),
};

const els = {
  empty: document.getElementById("empty-cart"),
  layout: document.getElementById("checkout-layout"),
  loading: document.getElementById("checkout-loading"),
  steps: document.querySelectorAll(".cko-step"),
  panels: document.querySelectorAll(".cko-panel"),
  addressCard: document.getElementById("address-card"),
  addressDetails: document.getElementById("address-details"),
  addressSummary: document.getElementById("address-summary"),
  shippingCard: document.getElementById("shipping-card"),
  shippingOptions: document.getElementById("shipping-options"),
  shippingHint: document.getElementById("shipping-hint"),
  step2Submit: document.getElementById("step-2-submit"),
  urgencia: document.getElementById("cko-urgencia"),
  relogio: document.getElementById("cko-relogio"),
  beneficios: document.getElementById("cko-beneficios"),
  processing: document.getElementById("processing"),
  year: document.getElementById("year"),
};

function finishBoot() {
  if (els.loading) {
    els.loading.hidden = true;
    els.loading.setAttribute("aria-busy", "false");
  }
  document.body.classList.remove("cko-booting");
  document.body.classList.add("cko-ready");
}

/** Last CEP successfully resolved via ViaCEP (8 digits). */
let lastResolvedCep = "";
/** In-flight lookup guard to avoid duplicate fetches. */
let cepLookupPending = null;

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(CHECKOUT_DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDraft() {
  localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(state.form));
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function clearCart() {
  localStorage.setItem(CART_KEY, "[]");
  state.cart = [];
}

function itemKey(item, index) {
  return item.key || `${item.id || "item"}-${item.color || ""}-${item.size || ""}-${index}`;
}

function updateCheckoutQty(key, delta) {
  const item = state.cart.find((entry, index) => itemKey(entry, index) === key);
  if (!item) return;
  item.qty = Math.max(1, Math.min(99, Number(item.qty) + delta));
  saveCart();
  renderShipping();
  renderInstallments();
  updatePaymentPanels();
}

/* "Remover produto" do print. Segue o mesmo caminho de updateCheckoutQty:
   mexe no state, grava e manda os dependentes de preco redesenharem.
   Se sair o ultimo item, saveCart deixa o carrinho vazio e a tela de
   "Seu carrinho esta vazio" assume — nao ha estado intermediario. */
function removeCheckoutItem(key) {
  const i = state.cart.findIndex((entry, index) => itemKey(entry, index) === key);
  if (i < 0) return;
  state.cart.splice(i, 1);
  saveCart();

  /* Tirar o ultimo item deixava a tela montada e vazia: o bloco .cko-empty so
     era acionado no boot, entao quem removia tudo ficava olhando um checkout
     sem produto, sem preco e sem explicacao. */
  if (!state.cart.length) {
    if (els.empty) els.empty.hidden = false;
    if (els.layout) els.layout.hidden = true;
    return;
  }

  renderShipping();
  renderInstallments();
  updatePaymentPanels();
}

function subtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function shippingPrice() {
  const method = shippingMethods.find((m) => m.id === state.shippingId);
  return method ? method.price : null;
}

function discountAmount() {
  if (state.paymentMethod !== "PIX") return 0;
  return subtotal() * (PIX_DISCOUNT_PERCENT / 100);
}

function total() {
  const ship = shippingPrice();
  return subtotal() - discountAmount() + (ship ?? 0);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function maskPhone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCpf(value) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCep(value) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCard(value) {
  return onlyDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function maskExp(value) {
  return onlyDigits(value)
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, "$1/$2");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCpf(cpf) {
  const s = onlyDigits(cpf);
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(s[i]) * (10 - i);
  let dig = (sum * 10) % 11;
  if (dig === 10) dig = 0;
  if (dig !== Number(s[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(s[i]) * (11 - i);
  dig = (sum * 10) % 11;
  if (dig === 10) dig = 0;
  return dig === Number(s[10]);
}

function isValidPhone(phone) {
  const d = onlyDigits(phone);
  return d.length === 10 || d.length === 11;
}

function setFieldError(name, message) {
  const input = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
  const error = document.querySelector(`[data-error-for="${name}"]`);
  const field = input?.closest(".cko-field");
  if (field) {
    field.classList.toggle("is-invalid", Boolean(message));
    if (message) field.classList.remove("is-valid");
  }
  if (error) error.textContent = message || "";
}

function setFieldValid(name, valid) {
  const input = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
  const field = input?.closest(".cko-field");
  if (!field) return;
  field.classList.toggle("is-valid", Boolean(valid));
  if (valid) field.classList.remove("is-invalid");
}

function isValidFullName(value) {
  return Boolean(value && value.trim().split(/\s+/).length >= 2);
}

function isValidExp(value) {
  const exp = onlyDigits(value || "");
  if (exp.length !== 4) return false;
  const month = Number(exp.slice(0, 2));
  const year = 2000 + Number(exp.slice(2));
  const now = new Date();
  return !(
    month < 1 ||
    month > 12 ||
    year < now.getFullYear() ||
    (year === now.getFullYear() && month < now.getMonth() + 1)
  );
}

function fieldValidators() {
  return {
    email: (v) => isValidEmail(v),
    fullName: (v) => isValidFullName(v),
    phone: (v) => isValidPhone(v),
    document: (v) => isValidCpf(v),
    zipCode: (v) => onlyDigits(v).length === 8,
    address: (v) => Boolean(v && v.trim().length >= 3),
    addressNumber: (v) => Boolean(v && String(v).trim()),
    complement: (v) => Boolean(v && String(v).trim()),
    neighborhood: (v) => Boolean(v && v.trim().length >= 2),
    city: (v) => Boolean(v && v.trim().length >= 2),
    state: (v) => Boolean(v),
    cardNumber: (v) => onlyDigits(v).length >= 13,
    nameOnCard: (v) => Boolean(v && v.trim().length >= 3),
    expirationDate: (v) => isValidExp(v),
    securityCode: (v) => onlyDigits(v).length >= 3,
    installments: (v) => Boolean(v),
  };
}

function updateFieldValidity(name) {
  const input = document.getElementById(name);
  if (!input) return;
  if (input.closest("[hidden]")) {
    setFieldValid(name, false);
    return;
  }
  const validators = fieldValidators();
  const validate = validators[name];
  if (!validate) return;
  const value = input.value;
  const empty = !String(value || "").trim();
  // Optional complement: only show check when filled
  if (name === "complement") {
    setFieldValid(name, !empty && validate(value));
    return;
  }
  if (empty) {
    setFieldValid(name, false);
    return;
  }
  setFieldValid(name, validate(value));
}

function updateAllFieldValidity() {
  Object.keys(fieldValidators()).forEach(updateFieldValidity);
}

function clearErrors(form) {
  form.querySelectorAll(".cko-error").forEach((el) => {
    el.textContent = "";
  });
  form.querySelectorAll(".cko-field.is-invalid").forEach((el) => {
    el.classList.remove("is-invalid");
  });
}

function collectForm(form) {
  const data = new FormData(form);
  data.forEach((value, key) => {
    state.form[key] = String(value).trim();
  });
  saveDraft();
}

function hydrateForm() {
  if (!state.form.fullName && (state.form.firstName || state.form.lastName)) {
    state.form.fullName = [state.form.firstName, state.form.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  Object.entries(state.form).forEach(([key, value]) => {
    const el = document.getElementById(key);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  });
  if (state.form.paymentMethod === "BILLET") {
    state.form.paymentMethod = "PIX";
  }
  if (state.form.paymentMethod) {
    state.paymentMethod = state.form.paymentMethod;
    const radio = document.querySelector(
      `input[name="paymentMethod"][value="${state.paymentMethod}"]`
    );
    if (radio) radio.checked = true;
  }
  if (state.form.shippingId) {
    const known = shippingMethods.some((m) => m.id === state.form.shippingId);
    state.shippingId = known ? state.form.shippingId : null;
    if (!known) {
      state.form.shippingId = null;
      saveDraft();
    }
  }
}

function goToStep(step) {
  state.step = step;
  els.panels.forEach((panel) => {
    const n = Number(panel.getAttribute("data-step"));
    panel.hidden = n !== step;
  });
  els.steps.forEach((btn) => {
    const n = Number(btn.getAttribute("data-goto"));
    const isCurrent = n === step;
    const isDone = n < step;
    btn.classList.toggle("is-current", isCurrent);
    btn.classList.toggle("is-done", isDone);
    btn.disabled = n > step;
    if (isCurrent) btn.setAttribute("aria-current", "step");
    else btn.removeAttribute("aria-current");
    const status = btn.querySelector(".cko-step-status");
    if (status) {
      status.textContent = isCurrent ? "Etapa atual" : isDone ? "Etapa concluída" : "";
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.TapecarAnalytics?.track?.("checkout_step", {
    step,
    qty: state.cart.reduce((s, i) => s + i.qty, 0),
    value: typeof total === "function" ? total() : null,
  });
}

function compareWithoutPix() {
  return subtotal() + (shippingPrice() ?? 0);
}

function renderSummary() {
  const html = state.cart
    .map((item, index) => {
      const key = itemKey(item, index);
      return `
      <div class="cko-line" data-line-key="${key}">
        <img src="${item.image}" alt="" width="64" height="80" />
        <div class="cko-line-info">
          <h3>${item.name}</h3>
          <p>${item.color} / ${item.size}</p>
          ${PIX_DISCOUNT_PERCENT > 0 ? `<span class="cko-line-pix">${PIX_DISCOUNT_PERCENT}% OFF NO PIX</span>` : ""}
          <div class="cko-qty" role="group" aria-label="Quantidade">
            <button type="button" class="cko-qty-btn" data-qty-delta="-1" data-qty-key="${key}" aria-label="Diminuir quantidade">−</button>
            <span class="cko-qty-value" aria-live="polite">${item.qty}</span>
            <button type="button" class="cko-qty-btn" data-qty-delta="1" data-qty-key="${key}" aria-label="Aumentar quantidade">+</button>
          </div>
          <button type="button" class="cko-line-remove" data-remove-key="${key}">Remover produto</button>
        </div>
        <div class="cko-line-price">${money(item.price * item.qty)}</div>
      </div>`;
    })
    .join("");

  document.querySelectorAll(".cko-summary-items").forEach((el) => {
    el.innerHTML = html;
  });

  const ship = shippingPrice();
  const discount = discountAmount();
  // Sem selecao ainda: o padrao e o frete gratuito, entao "Grátis" e o que
  // o cliente realmente vai pagar — "A calcular" so gerava duvida.
  const shipLabel = ship === null || ship === 0 ? "Grátis" : money(ship);
  const pixTotal = total();
  const compare = compareWithoutPix();

  document.querySelectorAll("[data-summary-subtotal]").forEach((el) => {
    el.textContent = money(subtotal());
  });
  document.querySelectorAll("[data-summary-shipping]").forEach((el) => {
    el.textContent = shipLabel;
  });
  document.querySelectorAll("[data-summary-discount]").forEach((el) => {
    el.textContent = `− ${money(discount)}`;
  });
  document.querySelectorAll("[data-discount-row]").forEach((el) => {
    el.hidden = discount <= 0;
  });
  document.querySelectorAll("[data-summary-total]").forEach((el) => {
    el.textContent = money(total());
  });
  document.querySelectorAll("[data-pix-total]").forEach((el) => {
    el.textContent = money(pixTotal);
  });
  document.querySelectorAll("[data-pix-compare]").forEach((el) => {
    el.textContent = money(compare);
    el.hidden = discount <= 0;
  });
}

function availableShipping() {
  return shippingMethods.slice();
}

function renderShipping() {
  const hasAddress =
    onlyDigits(state.form.zipCode || "").length === 8 &&
    Boolean(state.form.address) &&
    Boolean(state.form.city);

  if (state.deliveryPhase !== "shipping" || !hasAddress) {
    els.shippingOptions.hidden = true;
    if (els.shippingHint) {
      els.shippingHint.hidden = false;
      els.shippingHint.textContent = "Escolha uma forma de entrega:";
    }
    return;
  }

  if (els.shippingHint) {
    els.shippingHint.hidden = false;
    els.shippingHint.textContent = "Escolha uma forma de entrega:";
  }
  els.shippingOptions.hidden = false;
  const methods = availableShipping();
  if (!state.shippingId || !methods.some((m) => m.id === state.shippingId)) {
    state.shippingId = methods[0]?.id || null;
  }

  els.shippingOptions.innerHTML = methods
    .map(
      (m) => `
      <label class="cko-ship-option ${m.id === state.shippingId ? "is-selected" : ""}">
        <input type="radio" name="shipping" value="${m.id}" ${
        m.id === state.shippingId ? "checked" : ""
      } />
        <span class="cko-ship-body">
          <strong>${m.title}</strong>
          <span class="cko-ship-meta">
            <span class="cko-ship-turnaround">${m.turnaround}</span>
            <img class="cko-ship-carrier" src="${m.icon}" alt="${m.iconAlt}" width="${m.iconWidth}" height="${m.iconHeight}" />
          </span>
        </span>
        <span class="cko-ship-price ${m.price === 0 ? "is-free" : ""}">${
        m.price === 0 ? "Grátis" : money(m.price)
      }</span>
      </label>`
    )
    .join("");
}

function setDeliveryDetailsVisible(visible) {
  if (els.addressDetails) els.addressDetails.hidden = !visible;
  if (!visible && state.deliveryPhase === "shipping") {
    setDeliveryPhase("address");
  }
}

function updateAddressSummary() {
  const line1 = document.getElementById("address-summary-line1");
  const line2 = document.getElementById("address-summary-line2");
  if (!line1 || !line2) return;
  const street = state.form.address || "";
  const number = state.form.addressNumber || "";
  const neighborhood = state.form.neighborhood || "";
  const city = state.form.city || "";
  const uf = state.form.state || "";
  const cep = state.form.zipCode || "";
  const complement = state.form.complement ? ` — ${state.form.complement}` : "";
  line1.textContent = `${street}, ${number}${complement}${neighborhood ? ` - ${neighborhood}` : ""}`;
  line2.textContent = `${city}${city && uf ? " - " : ""}${uf}${cep ? ` | CEP ${cep}` : ""}`;
}

function setDeliveryPhase(phase) {
  state.deliveryPhase = phase === "shipping" ? "shipping" : "address";
  const onShipping = state.deliveryPhase === "shipping";

  if (els.addressCard) els.addressCard.hidden = onShipping;
  if (els.addressSummary) els.addressSummary.hidden = !onShipping;
  if (els.shippingCard) els.shippingCard.hidden = !onShipping;

  if (els.step2Submit) {
    els.step2Submit.textContent = onShipping ? "Ir para o pagamento" : "Selecionar frete";
  }

  if (onShipping) {
    updateAddressSummary();
    renderShipping();
    renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (els.shippingOptions) {
    els.shippingOptions.hidden = true;
  }
}

function clearViaCepFields() {
  ["address", "neighborhood", "city", "state"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  lastResolvedCep = "";
  state.shippingId = null;
  if (state.form) {
    state.form.address = "";
    state.form.neighborhood = "";
    state.form.city = "";
    state.form.state = "";
    state.form.shippingId = null;
    saveDraft();
  }
  renderShipping();
  renderSummary();
}

function syncDeliveryVisibilityFromDraft() {
  const cep = onlyDigits(document.getElementById("zipCode")?.value || "");
  if (cep.length === 8) {
    lastResolvedCep = cep;
    setDeliveryDetailsVisible(true);
    collectForm(document.getElementById("step-2"));
    renderShipping();
  } else {
    setDeliveryDetailsVisible(false);
  }
}

/**
 * Beehive "Taxas no cartão" — tabela real da conta.
 * Sem juros so a vista; de 2x em diante a taxa e repassada ao comprador.
 * A curva nao e crescente (5x sai abaixo de 4x, 9x abaixo de 8x): e assim
 * na tabela do gateway, nao e engano de digitacao.
 */
const CARD_FREE_INSTALLMENTS = 1;
/** Teto de parcelas oferecido ao comprador. */
const CARD_MAX_INSTALLMENTS = 3;
const CARD_INSTALLMENT_FEE_PERCENT = {
  2: 23.0,
  3: 24.1,
  4: 26.15,
  5: 23.27,
  6: 25.5,
  7: 26.5,
  8: 29.7,
  9: 28.3,
  10: 37.0,
  11: 38.0,
  12: 39.0,
};

function cardInstallmentFeePercent(n) {
  const k = Math.max(1, Math.min(CARD_MAX_INSTALLMENTS, Math.round(Number(n) || 1)));
  if (k <= CARD_FREE_INSTALLMENTS) return 0;
  return Number(CARD_INSTALLMENT_FEE_PERCENT[k] || 0);
}

function cardInstallmentTotal(base, n) {
  const fee = cardInstallmentFeePercent(n);
  return Math.max(0, Number(base) || 0) * (1 + fee / 100);
}
function renderInstallments() {
  const select = document.getElementById("installments");
  if (!select) return;
  // Card never uses Pix discount
  const base = Math.max(0, subtotal() + (shippingPrice() || 0));
  const max = CARD_MAX_INSTALLMENTS;
  select.innerHTML = Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const fee = cardInstallmentFeePercent(n);
    const charged = cardInstallmentTotal(base, n);
    const value = charged / n;
    let label;
    if (n === 1) label = `À vista — ${money(base)}`;
    else if (fee <= 0) label = `${n}x de ${money(value)} sem juros`;
    else label = `${n}x de ${money(value)} com juros — total ${money(charged)}`;
    return `<option value="${n}">${label}</option>`;
  }).join("");
}


function updatePaymentPanels() {
  const method =
    document.querySelector('input[name="paymentMethod"]:checked')?.value || "PIX";
  const previous = state.paymentMethod;
  state.paymentMethod = method;
  state.form.paymentMethod = method;
  saveDraft();

  document.querySelectorAll("[data-pay-block]").forEach((block) => {
    const id = block.getAttribute("data-pay-block");
    const selected = id === method;
    block.classList.toggle("is-selected", selected);
    block.classList.toggle("is-open", selected);
  });

  const payPix = document.getElementById("pay-pix");
  const payCard = document.getElementById("pay-card");
  if (payPix) payPix.hidden = method !== "PIX";
  if (payCard) payCard.hidden = method !== "CREDIT_CARD";

  renderInstallments();
  renderSummary();
  updateAllFieldValidity();

  if (previous !== method || !updatePaymentPanels._trackedOnce) {
    updatePaymentPanels._trackedOnce = true;
    window.TapecarAnalytics?.track?.("payment_method", {
      method: method === "PIX" ? "pix" : "card",
      value: typeof total === "function" ? total() : null,
      qty: state.cart.reduce((s, i) => s + i.qty, 0),
      product: state.cart[0]
        ? { id: state.cart[0].id, name: state.cart[0].name, price: state.cart[0].price }
        : null,
      items: state.cart.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
      })),
      meta: { userData: metaUserDataFromForm(state.form) },
    });
  }
}

function abandonCartFingerprint(payload) {
  const items = (payload.items || [])
    .map((i) => `${i.id || ""}:${i.name || ""}:${i.qty || 1}:${i.price || 0}`)
    .join("|");
  return `${String(payload.customer?.email || "").toLowerCase()}::${items}`;
}

function markAbandonEligible() {
  if (!state.cart.length) return;
  const email = String(state.form.email || "").trim().toLowerCase();
  const name = String(state.form.fullName || "").trim();
  const phone = onlyDigits(state.form.phone || "");
  // Elegível com e-mail + (telefone OU nome), em qualquer etapa
  if (!email || !isValidEmail(email)) return;
  if (phone.length < 10 && name.length < 2) return;

  const payload = {
    customer: { name, email, phone },
    items: state.cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      color: i.color,
      size: i.size,
    })),
    amount_cents: Math.round(total() * 100),
    cart_key: abandonCartFingerprint({
      customer: { email },
      items: state.cart,
    }),
  };
  try {
    sessionStorage.setItem(ABANDON_ELIGIBLE_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(ABANDON_CONVERTED_KEY);
  } catch {
    /* ignore */
  }
}

function markAbandonConverted() {
  try {
    sessionStorage.setItem(ABANDON_CONVERTED_KEY, "1");
    sessionStorage.removeItem(ABANDON_ELIGIBLE_KEY);
  } catch {
    /* ignore */
  }
}

function maybeSendCartAbandoned() {
  try {
    if (sessionStorage.getItem(ABANDON_CONVERTED_KEY) === "1") return;
    const raw = sessionStorage.getItem(ABANDON_ELIGIBLE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (!payload?.customer?.email || !Array.isArray(payload.items) || !payload.items.length) return;

    const key = payload.cart_key || abandonCartFingerprint(payload);
    if (sessionStorage.getItem(ABANDON_SENT_KEY) === key) return;
    sessionStorage.setItem(ABANDON_SENT_KEY, key);

    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon("/api/cart-abandoned", blob);
      if (ok) return;
    }
    fetch("/api/cart-abandoned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function refreshAbandonFromInputs() {
  const emailEl = document.getElementById("email");
  const phoneEl = document.getElementById("phone");
  const nameEl = document.getElementById("fullName");
  if (emailEl) state.form.email = String(emailEl.value || "").trim();
  if (phoneEl) state.form.phone = String(phoneEl.value || "").trim();
  if (nameEl) state.form.fullName = String(nameEl.value || "").trim();
  markAbandonEligible();
}

function bindAbandonedCartTracking() {
  const onLeave = () => {
    refreshAbandonFromInputs();
    maybeSendCartAbandoned();
  };
  window.addEventListener("pagehide", onLeave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onLeave();
  });
  ["email", "phone", "fullName"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", refreshAbandonFromInputs);
    el.addEventListener("change", refreshAbandonFromInputs);
    el.addEventListener("blur", refreshAbandonFromInputs);
  });
}

function validateStep1(form) {
  clearErrors(form);
  collectForm(form);
  let ok = true;

  if (!state.form.email) {
    setFieldError("email", "E-mail é obrigatório");
    ok = false;
  } else if (!isValidEmail(state.form.email)) {
    setFieldError("email", "Email inválido");
    ok = false;
  }

  if (!state.form.fullName || state.form.fullName.trim().split(/\s+/).length < 2) {
    setFieldError("fullName", "Nome deve ter pelo menos nome e sobrenome");
    ok = false;
  }

  if (!state.form.phone) {
    setFieldError("phone", "Telefone é obrigatório");
    ok = false;
  } else if (!isValidPhone(state.form.phone)) {
    setFieldError("phone", "Telefone inválido. Use o formato (11) 99999-9999");
    ok = false;
  }

  if (!state.form.document) {
    setFieldError("document", "CPF é obrigatório");
    ok = false;
  } else if (!isValidCpf(state.form.document)) {
    setFieldError("document", "CPF inválido");
    ok = false;
  }

  return ok;
}

function validateAddress(form) {
  clearErrors(form);
  collectForm(form);
  let ok = true;

  if (onlyDigits(state.form.zipCode || "").length !== 8) {
    setFieldError("zipCode", "CEP deve ter 8 dígitos");
    ok = false;
  }
  if (!state.form.address || state.form.address.length < 3) {
    setFieldError("address", "Endereço deve ter pelo menos 3 caracteres");
    ok = false;
  }
  if (!state.form.addressNumber) {
    setFieldError("addressNumber", "Número é obrigatório");
    ok = false;
  }
  if (!state.form.neighborhood || state.form.neighborhood.length < 2) {
    setFieldError("neighborhood", "Bairro deve ter pelo menos 2 caracteres");
    ok = false;
  }
  if (!state.form.city || state.form.city.length < 2) {
    setFieldError("city", "Cidade deve ter pelo menos 2 caracteres");
    ok = false;
  }
  if (!state.form.state) {
    setFieldError("state", "Estado é obrigatório");
    ok = false;
  }

  return ok;
}

function validateShipping(form) {
  clearErrors(form);
  collectForm(form);
  renderShipping();
  if (!state.shippingId) {
    const err = document.querySelector('[data-error-for="shipping"]');
    if (err) err.textContent = "Por favor, selecione uma opção de frete";
    return false;
  }
  state.form.shippingId = state.shippingId;
  saveDraft();
  return true;
}

function validateStep2(form) {
  if (state.deliveryPhase !== "shipping") {
    return validateAddress(form);
  }
  return validateShipping(form);
}

function validateStep3(form) {
  clearErrors(form);
  collectForm(form);
  updatePaymentPanels();
  let ok = true;

  if (state.paymentMethod === "CREDIT_CARD") {
    const number = onlyDigits(state.form.cardNumber || "");
    if (number.length < 13) {
      setFieldError("cardNumber", "Número do cartão inválido");
      ok = false;
    }
    if (!state.form.nameOnCard || state.form.nameOnCard.length < 3) {
      setFieldError("nameOnCard", "Nome no cartão deve ter pelo menos 3 caracteres");
      ok = false;
    }
    const exp = onlyDigits(state.form.expirationDate || "");
    if (exp.length !== 4) {
      setFieldError("expirationDate", "Data de validade inválida (MM/AA)");
      ok = false;
    } else {
      const month = Number(exp.slice(0, 2));
      const year = 2000 + Number(exp.slice(2));
      const now = new Date();
      const expired =
        month < 1 ||
        month > 12 ||
        year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1);
      if (expired) {
        setFieldError("expirationDate", "Data de validade inválida ou expirada");
        ok = false;
      }
    }
    if (onlyDigits(state.form.securityCode || "").length < 3) {
      setFieldError("securityCode", "Código de segurança deve ter pelo menos 3 dígitos");
      ok = false;
    }
  }

  return ok;
}

async function lookupCep({ focusNumber = true } = {}) {
  const zipInput = document.getElementById("zipCode");
  const cep = onlyDigits(zipInput?.value);
  if (cep.length !== 8) {
    setFieldError("zipCode", "CEP deve ter 8 dígitos");
    setDeliveryDetailsVisible(false);
    return;
  }

  if (cep === lastResolvedCep && els.addressDetails && !els.addressDetails.hidden) {
    return;
  }

  if (cepLookupPending === cep) return;
  cepLookupPending = cep;
  setFieldError("zipCode", "");

  const revealManualAddress = () => {
    clearViaCepFields();
    lastResolvedCep = cep;
    setFieldError("zipCode", "");
    setDeliveryDetailsVisible(true);
    collectForm(document.getElementById("step-2"));
    renderShipping();
    renderSummary();
    ["zipCode", "address", "neighborhood", "city", "state"].forEach(updateFieldValidity);
    if (focusNumber) {
      const addressField = document.getElementById("address");
      requestAnimationFrame(() => {
        addressField?.focus({ preventScroll: false });
        addressField?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  };

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    // User may have edited CEP while the request was in flight
    const current = onlyDigits(document.getElementById("zipCode")?.value);
    if (current !== cep) return;

    if (data.erro) {
      revealManualAddress();
      return;
    }

    document.getElementById("address").value = data.logradouro || "";
    document.getElementById("neighborhood").value = data.bairro || "";
    document.getElementById("city").value = data.localidade || "";
    document.getElementById("state").value = data.uf || "";
    lastResolvedCep = cep;
    setFieldError("zipCode", "");
    setDeliveryDetailsVisible(true);
    collectForm(document.getElementById("step-2"));
    renderShipping();
    renderSummary();
    ["zipCode", "address", "neighborhood", "city", "state"].forEach(updateFieldValidity);

    if (focusNumber) {
      const numberField = document.getElementById("addressNumber");
      requestAnimationFrame(() => {
        numberField?.focus({ preventScroll: false });
        numberField?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  } catch {
    revealManualAddress();
  } finally {
    if (cepLookupPending === cep) cepLookupPending = null;
  }
}

const ORDER_KEY = "tapecar-order-v1";
const PIX_ORDER_KEY = "tapecar-pix-order-v1";
const PIX_TIMER_KEY = "tapecar-pix-expires-v1";

let paymentSdkReady = null;

/**
 * A Beehive as vezes devolve o motivo como objeto ({code, message}).
 * new Error(objeto) vira "[object Object]" e o cliente perde a razao real
 * da recusa — esta funcao garante texto legivel em qualquer formato.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function errorText(value, fallback) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const nested =
      value.message || value.error || value.description || value.detail || value.reason;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
    try {
      const json = JSON.stringify(value);
      if (json && json !== "{}") return json;
    } catch {
      /* cai no fallback */
    }
  }
  return fallback;
}

function setPaymentError(message) {
  const el = document.getElementById("payment-error");
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}

function buildCustomerPayload(form = {}) {
  return {
    name: form.fullName || "",
    email: form.email || "",
    phone: onlyDigits(form.phone || ""),
    cpf: form.document || "",
    address: {
      street: form.address || "",
      number: form.addressNumber || "",
      complement: form.complement || "",
      neighborhood: form.neighborhood || "",
      city: form.city || "",
      state: form.state || "",
      zipcode: onlyDigits(form.zipCode || ""),
      country: "BR",
    },
  };
}

function amountToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function buildPaymentItems() {
  return state.cart.map((item) => ({
    id: item.id,
    title: [item.name, item.color, item.size].filter(Boolean).join(" — ") || "Produto",
    unitPrice: amountToCents(item.price),
    quantity: item.qty || 1,
    tangible: true,
  }));
}

function parseInstallments() {
  const raw = String(state.form.installments || document.getElementById("installments")?.value || "1");
  const n = Number(onlyDigits(raw) || raw.split("x")[0] || 1);
  return Math.max(1, Math.min(CARD_MAX_INSTALLMENTS, Number.isFinite(n) ? n : 1));
}

async function loadPaymentSdk(cfg = {}) {
  const globalName = cfg.sdkGlobal || (cfg.gateway === "payout" ? "Payout" : "BeehivePay");
  if (window[globalName]) return window[globalName];

  const src =
    cfg.jsSdkUrl ||
    (cfg.gateway === "payout"
      ? "https://api.payoutbr.com.br/v1/js"
      : "https://api.conta.paybeehive.com.br/v1/js");

  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-payment-sdk]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar SDK de pagamento")));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.paymentSdk = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar SDK de pagamento"));
    document.head.appendChild(script);
  });
  if (!window[globalName]) throw new Error(`${globalName} indisponível`);
  return window[globalName];
}

async function ensurePaymentSdkReady() {
  if (paymentSdkReady) return paymentSdkReady;
  paymentSdkReady = (async () => {
    const cfgRes = await fetch("/api/payment/config");
    const cfg = await cfgRes.json();
    if (!cfg.configured) {
      throw new Error(cfg.error || "Gateway de pagamento não configurado");
    }
    if (!cfg.publicKey) {
      throw new Error(
        cfg.gateway === "beehive"
          ? "BEEHIVE_PUBLIC_KEY não configurada (necessária para cartão)"
          : "PAYOUT_PUBLIC_KEY não configurada (necessária para cartão)"
      );
    }
    const Pay = await loadPaymentSdk(cfg);
    Pay.setPublicKey(cfg.publicKey);
    if (typeof Pay.setTestMode === "function") {
      Pay.setTestMode(Boolean(cfg.testMode));
    }
    return { Pay, cfg };
  })();
  try {
    return await paymentSdkReady;
  } catch (err) {
    paymentSdkReady = null;
    throw err;
  }
}

async function tokenizeCard() {
  const { Pay } = await ensurePaymentSdkReady();
  const number = onlyDigits(state.form.cardNumber || "");
  const exp = onlyDigits(state.form.expirationDate || "");
  const month = Number(exp.slice(0, 2));
  const year2 = Number(exp.slice(2));
  const year = year2 < 100 ? 2000 + year2 : year2;
  const card = {
    number,
    holderName: String(state.form.nameOnCard || "").trim(),
    expMonth: month,
    expYear: year,
    cvv: onlyDigits(state.form.securityCode || ""),
  };

  const installments = parseInstallments();
  const amountCents = amountToCents(cardInstallmentTotal(total(), installments));

  if (typeof Pay.is3DSAvailable === "function") {
    try {
      const available = await Pay.is3DSAvailable();
      if (available && typeof Pay.authenticate3DS === "function") {
        await Pay.authenticate3DS({
          amount: amountCents,
          currency: "brl",
          installments,
          card,
        });
      }
    } catch (err) {
      console.warn("3DS:", err);
      throw new Error(err?.message || "Falha na autenticação 3DS do cartão");
    }
  }

  const token = await Pay.encrypt(card);
  if (!token) throw new Error("Não foi possível tokenizar o cartão");
  return { token, installments, amountCents };
}

function readTrackingParameters() {
  const keys = ["src", "sck", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"];
  const empty = () => Object.fromEntries(keys.map((k) => [k, null]));
  const fromParams = (params) => {
    const out = empty();
    let has = false;
    keys.forEach((k) => {
      const v = params.get(k);
      if (v) {
        out[k] = v;
        has = true;
      }
    });
    return has ? out : null;
  };

  const fromUrl = fromParams(new URLSearchParams(window.location.search));
  if (fromUrl) {
    try {
      sessionStorage.setItem("tapecar-utmify-v1", JSON.stringify(fromUrl));
    } catch {
      /* ignore */
    }
    return fromUrl;
  }

  try {
    const stored = JSON.parse(sessionStorage.getItem("tapecar-utmify-v1") || "null");
    if (stored && typeof stored === "object") {
      const out = empty();
      keys.forEach((k) => {
        out[k] = stored[k] || null;
      });
      return out;
    }
  } catch {
    /* ignore */
  }

  try {
    const legacy = JSON.parse(sessionStorage.getItem("tapecar-utm-v1") || "{}");
    if (legacy && (legacy.source || legacy.campaign || legacy.medium || legacy.content || legacy.term)) {
      return {
        src: legacy.src || null,
        sck: legacy.sck || null,
        utm_source: legacy.source || legacy.utm_source || null,
        utm_campaign: legacy.campaign || legacy.utm_campaign || null,
        utm_medium: legacy.medium || legacy.utm_medium || null,
        utm_content: legacy.content || legacy.utm_content || null,
        utm_term: legacy.term || legacy.utm_term || null,
      };
    }
  } catch {
    /* ignore */
  }
  return empty();
}

async function createPayment(payload) {
  const res = await fetch("/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = errorText(
      data.error || data.message,
      `Erro ao processar pagamento (${res.status})`
    );
    const err = new Error(msg);
    err.data = data;
    throw err;
  }
  return data;
}

function goToPixPage(payment) {
  const orderTotal = total();
  const expiresAt = payment.pix_expires_at
    ? Date.parse(payment.pix_expires_at)
    : Date.now() + 30 * 60 * 1000;
  const customer = buildCustomerPayload(state.form);
  const payload = {
    orderId: payment.orderId,
    transactionId: payment.transactionId,
    email: state.form.email || "",
    fullName: state.form.fullName || "",
    customer,
    total: orderTotal,
    subtotal: subtotal(),
    shipping: shippingPrice() ?? 0,
    discount: discountAmount(),
    items: state.cart,
    pixCode: payment.pixCode,
    createdAt: Date.now(),
    expiresAt,
  };
  sessionStorage.setItem(PIX_ORDER_KEY, JSON.stringify(payload));
  sessionStorage.setItem(PIX_TIMER_KEY, String(expiresAt));

  // Dispara Pix gerado antes do redirect (keepalive) — evita perder evento se pix.html falhar.
  const pixMetaKey = "tapecar-pix-generated-meta-v1";
  try {
    sessionStorage.setItem(pixMetaKey, String(payment.orderId || payment.transactionId || ""));
  } catch {
    /* ignore */
  }
  window.TapecarAnalytics?.track?.("pix_generated", {
    value: orderTotal,
    qty: state.cart.reduce((s, i) => s + i.qty, 0),
    product: state.cart[0]
      ? { id: state.cart[0].id, name: state.cart[0].name, price: state.cart[0].price }
      : null,
    items: state.cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
    method: "pix",
    meta: {
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      page: "checkout.html",
      userData: metaUserDataFromForm(state.form),
    },
  });

  // Pix gerado nao e venda: o evento de compra so sai quando o pagamento
  // e confirmado, na tela do Pix (pix.js) ou pelo postback no servidor.

  markAbandonConverted();
  clearCart();
  localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  window.location.href = "/pix";
}

/**
 * Dispara um evento padrão do TikTok com o conteúdo do carrinho atual.
 * Sempre chamar ANTES de clearCart() — depois disso o carrinho está vazio.
 * @param {string} event
 * @param {number} [value] total em reais; usa total() quando omitido
 * @param {string} [transactionId] gera o event_id que deduplica com a Events API
 */
function trackTikTok(event, value, transactionId) {
  const api = window.GdcTikTok;
  if (!api) return;
  api.identify({
    email: state.form.email,
    phone: state.form.phone,
    cpf: state.form.document,
  });
  api.track(
    event,
    api.contentsFrom(state.cart, value != null ? value : total()),
    transactionId ? api.eventId(event, transactionId) : ""
  );
}

function metaUserDataFromForm(form = {}) {
  return {
    email: form.email || "",
    phone: form.phone || "",
    cpf: form.document || form.cpf || "",
    fullName: form.fullName || "",
    city: form.city || "",
    state: form.state || "",
    zipcode: form.zipCode || form.zipcode || "",
    country: "br",
  };
}

/**
 * Fecha o pedido e manda para a pagina de obrigado.
 * Os eventos saem daqui, ANTES do redirect: se o redirect falhar, a venda
 * ainda foi medida.
 * @param {{orderId?: string, orderTotal?: number, status?: "paid"|"pending"}} [param0]
 */
function showSuccess({ orderId, transactionId, orderTotal, status = "paid" } = {}) {
  markAbandonConverted();
  els.layout.hidden = true;

  const id = orderId || `LC-${Date.now().toString().slice(-8)}`;
  const value = orderTotal != null ? orderTotal : total();

  try {
    sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({
        orderId: id,
        transactionId: transactionId || "",
        total: value,
        method: "credit_card",
        email: state.form.email || "",
        status,
      })
    );
  } catch {
    /* a pagina de obrigado cai no numero do pedido da query string */
  }

  window.TapecarAnalytics?.track?.("order_complete", {
    value,
    qty: state.cart.reduce((s, i) => s + i.qty, 0),
    product: state.cart[0]
      ? { id: state.cart[0].id, name: state.cart[0].name, price: state.cart[0].price }
      : null,
    items: state.cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
    method: "card",
    meta: { orderId: id, userData: metaUserDataFromForm(state.form) },
  });

  clearCart();
  localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  window.location.href = `/obrigado?pedido=${encodeURIComponent(id)}`;
}

async function placeOrderPix() {
  const orderId = `LC-${Date.now().toString().slice(-8)}`;
  const payment = await createPayment({
    paymentMethod: "pix",
    amount_cents: amountToCents(total()),
    shipping_cents: amountToCents(shippingPrice() ?? 0),
    order_id: orderId,
    customer: buildCustomerPayload(state.form),
    items: buildPaymentItems(),
    trackingParameters: readTrackingParameters(),
    tiktok: window.GdcTikTok?.context?.() || null,
    pix_expires_seconds: 1800,
  });
  if (!payment.pixCode) {
    throw new Error("Gateway não retornou o código Pix. Verifique a conta Payout.");
  }
  goToPixPage(payment);
}

function formatCardExpiration(value) {
  const digits = onlyDigits(value || "");
  if (digits.length < 4) return null;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

async function placeOrderCard() {
  const { token, installments, amountCents } = await tokenizeCard();
  const orderId = `LC-${Date.now().toString().slice(-8)}`;
  const payment = await createPayment({
    paymentMethod: "credit_card",
    amount_cents: amountCents,
    shipping_cents: amountToCents(shippingPrice() ?? 0),
    order_id: orderId,
    customer: buildCustomerPayload(state.form),
    items: buildPaymentItems(),
    trackingParameters: readTrackingParameters(),
    tiktok: window.GdcTikTok?.context?.() || null,
    card_token: token,
    installments,
    cardNumber: state.form.cardNumber,
    securityCode: state.form.securityCode,
    card_expiration: formatCardExpiration(state.form.expirationDate),
  });

  const status = String(payment.status || "").toLowerCase();
  if (status === "paid" || status === "authorized") {
    trackTikTok("CompletePayment", cardInstallmentTotal(total(), installments), payment.transactionId);
    showSuccess({
      orderId: payment.orderId || String(payment.transactionId),
      transactionId: payment.transactionId,
      orderTotal: cardInstallmentTotal(total(), installments),
    });
    return;
  }

  if (status === "refused" || status === "failed" || status === "canceled") {
    const err = new Error(
      errorText(payment.refusedReason, "Pagamento recusado. Tente outro cartão.")
    );
    err.data = payment;
    throw err;
  }

  // Pending / processing — a pagina de obrigado ajusta o texto pelo status
  // Cartao pendente ainda nao e venda — nada de evento de compra aqui.
  showSuccess({
    orderId: payment.orderId || String(payment.transactionId),
    transactionId: payment.transactionId,
    orderTotal: cardInstallmentTotal(total(), installments),
    status: "pending",
  });
}

async function placeOrder() {
  setPaymentError("");
  trackTikTok("AddPaymentInfo");
  if (els.processing) els.processing.hidden = false;
  try {
    if (state.paymentMethod === "PIX") {
      await placeOrderPix();
      return;
    }
    await placeOrderCard();
  } catch (err) {
    console.error(err, err?.data);
    setPaymentError(errorText(err?.message, "Não foi possível finalizar o pagamento."));
  } finally {
    if (els.processing) els.processing.hidden = true;
  }
}

function bindMasks() {
  const phone = document.getElementById("phone");
  const documentInput = document.getElementById("document");
  const zip = document.getElementById("zipCode");
  const card = document.getElementById("cardNumber");
  const exp = document.getElementById("expirationDate");
  const cvv = document.getElementById("securityCode");

  phone?.addEventListener("input", () => {
    phone.value = maskPhone(phone.value);
    updateFieldValidity("phone");
  });
  documentInput?.addEventListener("input", () => {
    documentInput.value = maskCpf(documentInput.value);
    updateFieldValidity("document");
  });
  zip?.addEventListener("input", () => {
    zip.value = maskCep(zip.value);
    updateFieldValidity("zipCode");
    const digits = onlyDigits(zip.value);
    state.form.zipCode = zip.value;
    saveDraft();

    if (digits.length < 8) {
      if (lastResolvedCep || (els.addressDetails && !els.addressDetails.hidden)) {
        clearViaCepFields();
        setDeliveryDetailsVisible(false);
        setFieldError("zipCode", "");
      }
      return;
    }

    if (digits.length === 8) lookupCep({ focusNumber: true });
  });
  card?.addEventListener("input", () => {
    card.value = maskCard(card.value);
    updateFieldValidity("cardNumber");
  });
  exp?.addEventListener("input", () => {
    exp.value = maskExp(exp.value);
    updateFieldValidity("expirationDate");
  });
  cvv?.addEventListener("input", () => {
    cvv.value = onlyDigits(cvv.value).slice(0, 4);
    updateFieldValidity("securityCode");
  });
}

function bindEvents() {
  document.getElementById("step-1").addEventListener("submit", (event) => {
    event.preventDefault();
    if (validateStep1(event.currentTarget)) {
      markAbandonEligible();
      setDeliveryPhase("address");
      goToStep(2);
    }
  });

  document.getElementById("step-2").addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.deliveryPhase !== "shipping") {
      if (!validateAddress(event.currentTarget)) return;
      setDeliveryPhase("shipping");
      return;
    }
    if (validateShipping(event.currentTarget)) {
      renderInstallments();
      goToStep(3);
    }
  });

  document.getElementById("step-3").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateStep3(event.currentTarget)) return;
    await placeOrder();
  });

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.step === 2 && state.deliveryPhase === "shipping") {
        setDeliveryPhase("address");
        return;
      }
      goToStep(Math.max(1, state.step - 1));
    });
  });

  document.getElementById("edit-address-btn")?.addEventListener("click", () => {
    setDeliveryPhase("address");
  });

  els.steps.forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = Number(btn.getAttribute("data-goto"));
      if (n >= state.step) return;
      goToStep(n);
      if (n === 2) setDeliveryPhase("shipping");
    });
  });

  els.shippingOptions.addEventListener("change", (event) => {
    const input = event.target.closest('input[name="shipping"]');
    if (!input) return;
    state.shippingId = input.value;
    state.form.shippingId = input.value;
    saveDraft();
    renderShipping();
    renderInstallments();
    renderSummary();
  });

  document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", updatePaymentPanels);
  });

  document.querySelectorAll(".cko-summary-items").forEach((el) => {
    el.addEventListener("click", (event) => {
      const remover = event.target.closest("[data-remove-key]");
      if (remover) {
        event.preventDefault();
        removeCheckoutItem(remover.getAttribute("data-remove-key"));
        return;
      }
      const btn = event.target.closest("[data-qty-delta]");
      if (!btn) return;
      event.preventDefault();
      updateCheckoutQty(btn.getAttribute("data-qty-key"), Number(btn.getAttribute("data-qty-delta")));
    });
  });

  ["address", "city", "neighborhood", "addressNumber", "complement", "state", "fullName", "email", "nameOnCard", "installments"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      updateFieldValidity(id);
      if (["address", "city", "neighborhood", "addressNumber"].includes(id)) {
        collectForm(document.getElementById("step-2"));
        renderShipping();
        renderSummary();
      }
    });
  });
}

/** Dominios onde o site e a loja de verdade. Mantenha igual ao tiktok-pixel.js. */
const HOSTS_LOJA = ["tapecar.shop", "www.tapecar.shop"];

function ehProducao() {
  try {
    return HOSTS_LOJA.indexOf(window.location.hostname) !== -1;
  } catch {
    return true; // na duvida, trata como producao
  }
}

/**
 * Preco de teste via ?preco=1 — util para pagar um Pix de verdade sem gastar
 * R$ 149,90. IGNORADO em producao: o valor cobrado sai daqui, entao aceitar
 * isso no dominio real seria vender pelo preco que o comprador escolhesse.
 * @param {URLSearchParams} params
 * @returns {number}
 */
function precoDeTeste(params) {
  const padrao = 149.9;
  if (ehProducao()) return padrao;
  const bruto = Number(String(params.get("preco") || "").replace(",", "."));
  if (!Number.isFinite(bruto) || bruto < 1) return padrao;
  return Math.round(bruto * 100) / 100;
}

const URGENCIA_KEY = "tapecar-urgencia-v1";
const URGENCIA_MINUTOS = 15;

/**
 * Contador da barra de urgencia. O prazo fica guardado na sessao para nao
 * reiniciar a cada etapa do checkout — reiniciar deixaria obvio que o relogio
 * e decorativo. Ao zerar, ele para em 00:00 e nao bloqueia nada.
 */
function iniciarContagem() {
  if (!els.relogio || !els.urgencia) return;

  let fim = Number(sessionStorage.getItem(URGENCIA_KEY));
  if (!Number.isFinite(fim) || fim <= Date.now()) {
    fim = Date.now() + URGENCIA_MINUTOS * 60 * 1000;
    try {
      sessionStorage.setItem(URGENCIA_KEY, String(fim));
    } catch {
      /* segue sem persistir */
    }
  }

  const pintar = () => {
    const restam = Math.max(0, Math.floor((fim - Date.now()) / 1000));
    const min = String(Math.floor(restam / 60)).padStart(2, "0");
    const seg = String(restam % 60).padStart(2, "0");
    els.relogio.textContent = `${min}:${seg}`;
    return restam;
  };

  if (pintar() > 0) {
    const timer = setInterval(() => {
      if (pintar() <= 0) clearInterval(timer);
    }, 1000);
  }
}

function seedDemoCartIfNeeded() {
  if (state.cart.length) return;
  // Allow direct checkout testing via ?demo=1
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "1") return;
  const price = precoDeTeste(params);
  state.cart = [
    {
      /* Fixture de ?demo=1. O produto e a imagem anteriores eram de outro
         projeto e a foto nem existia aqui: o modo demo abria quebrado. */
      key: "tapetes-primeira_linha-carro_sem-Preto",
      id: "tapetes-automotivos-sob-medida",
      name: "Kit Tapetes Interno - Sem porta-malas",
      color: "Preto",
      size: "Fiat Uno 2015",
      price,
      qty: 1,
      image: "images/SEMPORTAMALAS.jpg",
    },
  ];
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function init() {
  if (els.year) els.year.textContent = String(new Date().getFullYear());
  if (els.processing) els.processing.hidden = true;
  readTrackingParameters();

  seedDemoCartIfNeeded();

  const summaryMobile = document.getElementById("summary-mobile");
  if (summaryMobile) {
    const sincronizar = () =>
      summaryMobile.setAttribute("aria-expanded", summaryMobile.open ? "true" : "false");
    sincronizar(); // nasce aberto, entao o estado precisa comecar coerente
    summaryMobile.addEventListener("toggle", sincronizar);
  }

  if (!state.cart.length) {
    els.empty.hidden = false;
    els.layout.hidden = true;
    finishBoot();
    return;
  }

  els.empty.hidden = true;
  els.layout.hidden = false;
  if (els.urgencia) els.urgencia.hidden = false;
  if (els.beneficios) els.beneficios.hidden = false;
  iniciarContagem();
  hydrateForm();
  bindMasks();
  bindEvents();
  bindAbandonedCartTracking();
  if (state.cart.length) {
    markAbandonEligible();
  }
  updatePaymentPanels();
  setDeliveryPhase("address");
  syncDeliveryVisibilityFromDraft();
  renderShipping();
  renderSummary();
  renderInstallments();
  updateAllFieldValidity();
  window.TapecarAnalytics?.track?.("page_view", {
    meta: { page: "checkout.html" },
  });
  window.TapecarAnalytics?.track?.("checkout_start", {
    qty: state.cart.reduce((s, i) => s + i.qty, 0),
    value: typeof total === "function" ? total() : subtotal(),
    product: state.cart[0]
      ? { id: state.cart[0].id, name: state.cart[0].name, price: state.cart[0].price }
      : null,
    items: state.cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
    meta: {
      page: "checkout.html",
      userData: metaUserDataFromForm(state.form),
    },
  });
  trackTikTok("InitiateCheckout");
  goToStep(1);
  finishBoot();
}

init();
