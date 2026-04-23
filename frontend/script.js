/* ======================
   DATA
====================== */
import { loadTires } from "./data/tires.js";

let tires = [];

/* ======================
   ELEMENTS
====================== */
const gallery = document.getElementById("tireGallery");
const searchInput = document.getElementById("searchInput");
const seasonFilter = document.getElementById("seasonFilter");
const radiusFilter = document.getElementById("radiusFilter");

const modal = document.getElementById("checkoutModal");
const closeModal = document.getElementById("closeModal");
const checkoutForm = document.getElementById("checkoutForm");

function shouldSilenceUnhandledRejection(reason) {
  if (!reason) return false;

  const message = typeof reason === "string" ? reason : reason.message;
  if (typeof message !== "string") return false;

  return message.includes(
    "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"
  );
}

window.addEventListener("unhandledrejection", event => {
  if (!shouldSilenceUnhandledRejection(event.reason)) return;

  console.warn("Ignored browser extension async message error:", event.reason);
  event.preventDefault();
});

/* ======================
   RENDER TIRES
====================== */
function renderTires(data) {
  gallery.innerHTML = "";

  const seasons = [
    {
      key: "winter",
      title: "Зимові шини",
      icon: "❄️",
      class: "season-winter",
      matches: ["winter"]
    },
    {
      key: "summer-all-season",
      title: "Літні / Всесезонні шини",
      icon: "☀️",
      class: "season-summer",
      matches: ["summer", "all-season"]
    },
    {
      key: "moto",
      title: "Мотошини",
      icon: "🏍️",
      class: "season-all-season",
      matches: ["moto"]
    }
  ];

  seasons.forEach(season => {
    const seasonTires = data.filter(t => season.matches.includes(t.season));
    if (!seasonTires.length) return;

    /* HEADER */
    const header = document.createElement("div");
    header.className = `season-header ${season.class}`;
    header.innerHTML = `
      <div class="season-title">
        <span class="season-icon">${season.icon}</span>
        <span>${season.title}</span>
      </div>
      <span class="season-count">${seasonTires.length} моделей</span>
    `;

    /* LIST */
    const list = document.createElement("div");
    list.className = "tire-list collapsed";

    seasonTires.forEach(tire => {
      const total =
                    (tire.stock ?? 0) +
                    (tire.showroom ?? 0) +
                    (tire.basement ?? 0);

      const card = document.createElement("div");
      card.className = "card";
      const availabilityText = total > 0 ? "✅ В наявності" : "❌ Немає в наявності";
      const inventoryHtml = `<p>${availabilityText}</p>`;

      card.innerHTML = `
        <img src="${tire.image}" alt="${tire.brand} ${tire.model}">
        <div class="card-body">
          <h3>${tire.brand} ${tire.model}</h3>

          <p>
            Розмір: ${tire.width}/${tire.profile} R${tire.radius} ${tire.loadIndex}
          </p>

          <p class="season-type">
            ${tire.season === "all-season"
    ? "🌿 Всесезонні"
    : tire.season === "summer"
      ? "☀️ Літні"
      : tire.season === "moto"
        ? "🏍️ Мотошини"
        : "❄️ Зимові"}
          </p>

          <p class="price">
            💲 ${tire.price} $ / шт
          </p>

          ${inventoryHtml}
        </div>
      `;

      const buyBtn = document.createElement("button");
      buyBtn.className = "buy-btn";
      buyBtn.textContent = total > 0 ? "Buy Now" : "Out of stock";
      buyBtn.disabled = total === 0;
      buyBtn.onclick = () => openCheckout(tire);

      card.appendChild(buyBtn);
      list.appendChild(card);

    });

    header.onclick = () => {
      list.classList.toggle("collapsed");
      header.classList.toggle("expanded", !list.classList.contains("collapsed"));
    };

    gallery.appendChild(header);
    gallery.appendChild(list);
  });
}


/* ======================
   FILTERS
====================== */
const widthFilter = document.getElementById("widthFilter");
const profileFilter = document.getElementById("profileFilter");
const inStockFilter = document.getElementById("inStockFilter");
const applyBtn = document.getElementById("applyFilters");
const resetBtn = document.getElementById("resetFilters");
const resultsCount = document.getElementById("resultsCount");

function getSeasonStats(items) {
  return items.reduce(
    (stats, tire) => {
      if (tire.season === "winter") stats.winter += 1;
      if (tire.season === "summer") stats.summer += 1;
      if (tire.season === "all-season") stats.allSeason += 1;
      if (tire.season === "moto") stats.moto += 1;
      return stats;
    },
    { winter: 0, summer: 0, allSeason: 0, moto: 0 }
  );
}

function renderResultsSummary(filtered) {
  const { winter, summer, allSeason, moto } = getSeasonStats(filtered);
  const summerAndAllSeason = summer + allSeason;

  if (!filtered.length) {
    resultsCount.textContent = "За цими параметрами шини не знайдено.";
    return;
  }

  resultsCount.textContent =
    `Знайдено шин: ${filtered.length} (❄️ Зима: ${winter}, ☀️/🌿 Літо + Всесезонні: ${summerAndAllSeason}, 🏍️ Мото: ${moto}). ` +
    "Списки нижче згорнуті — відкрийте потрібний сезон, щоб переглянути моделі.";
}

function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const season = seasonFilter.value;
  const radius = radiusFilter.value;
  const width = widthFilter.value;
  const profile = profileFilter.value;
  const inStockOnly = inStockFilter.checked;

  const filtered = tires.filter(tire => {
    const title = `${tire.brand} ${tire.model}`.toLowerCase();
    const total =
                  (tire.stock ?? 0) +
                  (tire.showroom ?? 0) +
                  (tire.basement ?? 0);

    if (search && !title.includes(search)) return false;
    if (season === "winter" && tire.season !== "winter") return false;
    if (season === "summer-all-season" && !["summer", "all-season"].includes(tire.season)) return false;
    if (season === "moto" && tire.season !== "moto") return false;
    if (radius && tire.radius !== Number(radius)) return false;
    if (width && tire.width !== Number(width)) return false;
    if (profile && tire.profile !== Number(profile)) return false;
    if (inStockOnly && total <= 0) return false;

    return true;
  });

  renderResultsSummary(filtered);
  renderTires(filtered);
}

applyBtn.addEventListener("click", applyFilters);

resetBtn.onclick = () => {
  document
    .querySelectorAll('.filters input:not([type="checkbox"]), .filters select')
    .forEach(el => (el.value = ""));
  inStockFilter.checked = false;
  resultsCount.textContent = "Параметри очищено. Показано всі шини.";
  renderTires(tires);
};

/* ======================
   CHECKOUT MODAL
====================== */
let selectedTire = null;

const summaryTire = document.getElementById("summaryTire");
const summarySize = document.getElementById("summarySize");
const summaryPrice = document.getElementById("summaryPrice");
const summaryAvailable = document.getElementById("summaryAvailable");
const summaryTotal = document.getElementById("summaryTotal");

const qtyInput = checkoutForm.querySelector('input[name="quantity"]');
const qtyMinusBtn = document.getElementById("qtyMinus");
const qtyPlusBtn = document.getElementById("qtyPlus");
const nameInput = checkoutForm.querySelector('input[name="name"]');
const phoneInput = checkoutForm.querySelector('input[name="phone"]');
const PHONE_PREFIX = "+380";
const PHONE_LOCAL_DIGITS = 9;

function getPhoneLocalDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return (digits.startsWith("380") ? digits.slice(3) : digits).slice(0, PHONE_LOCAL_DIGITS);
}

function formatPhoneValue(value) {
  const localDigits = getPhoneLocalDigits(value);

  const part1 = localDigits.slice(0, 2);
  const part2 = localDigits.slice(2, 5);
  const part3 = localDigits.slice(5, 7);
  const part4 = localDigits.slice(7, 9);
  const parts = [part1, part2, part3, part4].filter(Boolean);

  return parts.length ? `${PHONE_PREFIX} ${parts.join(" ")}` : PHONE_PREFIX;
}

function getCompactPhone(value) {
  return `${PHONE_PREFIX}${getPhoneLocalDigits(value)}`;
}

function normalizePhoneInput() {
  phoneInput.value = formatPhoneValue(phoneInput.value);
}

phoneInput.addEventListener("focus", normalizePhoneInput);
phoneInput.addEventListener("input", normalizePhoneInput);
phoneInput.addEventListener("blur", normalizePhoneInput);

function resolveApiBase() {
  const { hostname, port, protocol } = window.location;
  const isLocalHost = ["localhost", "127.0.0.1"].includes(hostname);

  if (protocol === "file:") return "http://127.0.0.1:3000";
  if (isLocalHost && port !== "3000") return "http://127.0.0.1:3000";
  return "";
}

const API_BASE = resolveApiBase();

function buildApiCandidates() {
  const candidates = new Set();
  const { hostname, protocol } = window.location;
  const localHosts = [hostname, "127.0.0.1", "localhost", "0.0.0.0"];

  if (API_BASE) candidates.add(API_BASE);
  candidates.add("");

  if (protocol !== "file:") {
    for (const host of localHosts) {
      if (!host) continue;
      candidates.add(`${protocol}//${host}:3000`);
    }
  }

  candidates.add("http://127.0.0.1:3000");
  candidates.add("http://localhost:3000");

  return [...candidates];
}

async function readErrorMessage(res) {
  const fallback = `HTTP ${res.status}`;

  try {
    const data = await res.clone().json();
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
  } catch {
    // ignore parse errors and try text body below
  }

  try {
    const text = (await res.text()).trim();
    if (text) return text;
  } catch {
    // ignore read errors and return fallback
  }

  return fallback;
}

async function postOrder(payload) {
  const candidates = buildApiCandidates();
  const errors = [];

  for (const base of candidates) {
    const endpoint = `${base}/api/order`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) return res;

      const message = await readErrorMessage(res);
      const error = new Error(`${message} @ ${endpoint}`);
      error.status = res.status;
      error.endpoint = endpoint;
      errors.push(error);

      if (res.status >= 500 || res.status === 404 || res.status === 405) {
        console.warn(`Order submit failed via ${endpoint}:`, error);
        continue;
      }

      throw error;
    } catch (err) {
      const status = Number(err?.status);
      const isHttpError = Number.isFinite(status);
      if (!isHttpError) {
        errors.push(err);
      }

      console.warn(`Order submit failed via ${endpoint}:`, err);
      if (isHttpError) throw err;
    }
  }

  const finalError = errors[errors.length - 1] || new Error("Unable to reach backend");
  finalError.details = errors;
  throw finalError;
}



function calcAvailable(tire) {
  return (tire.stock ?? 0) + (tire.showroom ?? 0) + (tire.basement ?? 0);
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} $`;
}



function normalizeQuantity({ clampToAvailable = false } = {}) {
  if (!selectedTire) return 0;

  const available = calcAvailable(selectedTire);
  const raw = qtyInput.value.trim();

  if (raw === "") {
    if (clampToAvailable && available > 0) {
      qtyInput.value = "1";
      return 1;
    }
    return 0;
  }

  let q = Number(raw);

  if (!Number.isFinite(q)) q = 0;
  q = Math.floor(q);

  if (q < 1) q = 1;
  if (clampToAvailable && q > available) q = available;

  qtyInput.value = q > 0 ? String(q) : "";
  return q;
}

function updateTotalUI() {
  if (!selectedTire) {
    summaryTotal.textContent = "—";
    return;
  }

  const quantity = normalizeQuantity();
  const price = Number(selectedTire.price ?? 0);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    summaryTotal.textContent = "—";
    return;
  }

  summaryTotal.textContent = formatMoney(price * quantity);
}

function openCheckout(tire) {
  selectedTire = tire;

  const available = calcAvailable(tire);

  summaryTire.textContent = `${tire.brand} ${tire.model}`;
  summarySize.textContent = `${tire.width}/${tire.profile} R${tire.radius} ${tire.loadIndex ?? ""}`.trim();
  summaryPrice.textContent = formatMoney(tire.price);
  summaryAvailable.textContent = available > 0 ? "Є в наявності" : "Немає в наявності";

  // налаштування кількості
  qtyInput.min = "1";
  qtyInput.max = String(available);
  qtyInput.value = available > 0 ? "1" : "0";
  qtyInput.disabled = available <= 0;
  qtyMinusBtn.disabled = available <= 0;
  qtyPlusBtn.disabled = available <= 0;

  updateTotalUI();

  modal.style.display = "flex";
}

qtyInput.addEventListener("input", () => {
  updateTotalUI();
});

qtyInput.addEventListener("blur", () => {
  normalizeQuantity({ clampToAvailable: true });
  updateTotalUI();
});

function changeQtyBy(delta) {
  if (!selectedTire || qtyInput.disabled) return;

  const available = calcAvailable(selectedTire);
  const current = normalizeQuantity({ clampToAvailable: true }) || 1;
  const next = Math.min(available, Math.max(1, current + delta));

  qtyInput.value = String(next);
  updateTotalUI();
}

function consumeStock(tire, quantity) {
  const locations = ["stock", "showroom", "basement"];
  let remaining = quantity;

  for (const location of locations) {
    const current = Number(tire[location] ?? 0);
    if (remaining <= 0) break;
    if (current <= 0) continue;

    const taken = Math.min(current, remaining);
    tire[location] = current - taken;
    remaining -= taken;
  }

  return remaining === 0;
}

qtyMinusBtn.addEventListener("click", () => changeQtyBy(-1));
qtyPlusBtn.addEventListener("click", () => changeQtyBy(1));

closeModal.onclick = () => {
  modal.style.display = "none";
  selectedTire = null;
  checkoutForm.reset();
  phoneInput.value = PHONE_PREFIX;
};

window.onclick = e => {
  if (e.target === modal) {
    modal.style.display = "none";
    selectedTire = null;
    checkoutForm.reset();
    phoneInput.value = PHONE_PREFIX;
  }

};


checkoutForm.onsubmit = async e => {
  e.preventDefault();

  if (!selectedTire) {
    alert("❌ Не вибрано шину");
    return;
  }

  const available = calcAvailable(selectedTire);
  const quantity = normalizeQuantity({ clampToAvailable: true });

  if (!Number.isFinite(quantity) || quantity <= 0) {
    alert("❌ Вкажіть коректну кількість");
    return;
  }
  if (quantity > available) {
    alert(`❌ Недостатньо шин. Доступно: ${available}`);
    return;
  }

  const name = nameInput.value.trim().toUpperCase();
  const phone = getCompactPhone(phoneInput.value);
  const prettyPhone = formatPhoneValue(phoneInput.value);

  if (phone.length !== 13) {
    alert("❌ Введіть 9 цифр телефону у форматі +380 XX XXX XX XX");
    return;
  }

  nameInput.value = name;
  phoneInput.value = prettyPhone;

  const price = Number(selectedTire.price ?? 0);
  const total = price * quantity;
  const payload = {
    tire: `${selectedTire.brand} ${selectedTire.model}`,
    size: `${selectedTire.width}/${selectedTire.profile} R${selectedTire.radius}`,
    price,
    quantity,
    available,
    total,
    customer: name,
    phone
  };

  try {
    await postOrder(payload);

    consumeStock(selectedTire, quantity);
    applyFilters();

    alert("✅ Замовлення відправлено!");
    modal.style.display = "none";
    selectedTire = null;
    checkoutForm.reset();
    phoneInput.value = PHONE_PREFIX;

  } catch (err) {
    console.error("Order submit failed:", err);

    const backendHint =
      "Перевірте, що backend запущений на http://127.0.0.1:3000 або http://localhost:3000";
    const errorText = typeof err?.message === "string" ? err.message.split(" @ ")[0] : "";

    alert(
      errorText
        ? `❌ Замовлення не відправлено: ${errorText}`
        : `❌ Замовлення не відправлено. ${backendHint}`
    );
  }
};

/* ======================
   INIT
====================== */
async function initApp() {
  try {
    tires = await loadTires();
    renderTires(tires);
    resultsCount.textContent = `Завантажено моделей: ${tires.length}`;
  } catch (error) {
    console.error("Failed to load tires:", error);
    resultsCount.textContent = "❌ Не вдалося завантажити список шин.";
    renderTires([]);
  }
}

initApp();
