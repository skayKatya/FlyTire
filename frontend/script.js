/* ======================
   DATA
====================== */
import { winterTires } from "./data/winter.js";
import { summerTires } from "./data/summer.js";
import { allSeasonTires } from "./data/allSeason.js";

/* обʼєднуємо всі дані */
const tires = [
  ...winterTires,
  ...summerTires,
  ...allSeasonTires
];

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
      key: "summer-all",
      title: "Літні + Всесезонні шини",
      icon: "☀️🌿",
      class: "season-summer-all",
      matches: ["summer", "all-season"]
    }
  ];

  seasons.forEach(season => {
    const seasonTires = data.filter(t => season.matches.includes(t.season));
    if (!seasonTires.length) return;

    const seasonCount = seasonTires.reduce(
    (sum, t) => sum + t.stock + t.showroom + t.basement,
      0
    );

    /* HEADER */
    const header = document.createElement("div");
    header.className = `season-header ${season.class}`;
    header.innerHTML = `
      <div class="season-title">
        <span class="season-icon">${season.icon}</span>
        <span>${season.title}</span>
      </div>
      <span class="season-count">${seasonCount} шт.</span>
    `;

    /* LIST */
    const list = document.createElement("div");
    list.className = "tire-list";

    seasonTires.forEach(tire => {
      const total =
                    (tire.stock ?? 0) +
                    (tire.showroom ?? 0) +
                    (tire.basement ?? 0);

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${tire.image}" alt="${tire.brand} ${tire.model}">
        <div class="card-body">
          <h3>${tire.brand} ${tire.model}</h3>

          <p>
            Розмір: ${tire.width}/${tire.profile} R${tire.radius} ${tire.loadIndex}
          </p>

          <p class="season-type">
            ${tire.season === "all-season" ? "🌿 Всесезонні" : tire.season === "summer" ? "☀️ Літні" : "❄️ Зимові"}
          </p>

          <p class="price">
            💲 ${tire.price} $ / шт
          </p>

          <p>📦 Склад: <strong>${tire.stock}</strong></p>
          <p>🛒 Вітрина: <strong>${tire.showroom}</strong></p>
          <p>🏢 Підвал: <strong>${tire.basement}</strong></p>
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

    header.onclick = () => list.classList.toggle("collapsed");

    gallery.appendChild(header);
    gallery.appendChild(list);
  });
}


/* ======================
   FILTERS
====================== */
const widthFilter = document.getElementById("widthFilter");
const profileFilter = document.getElementById("profileFilter");
const priceFrom = document.getElementById("priceFrom");
const priceTo = document.getElementById("priceTo");
const inStockFilter = document.getElementById("inStockFilter");
const applyBtn = document.getElementById("applyFilters");
const resetBtn = document.getElementById("resetFilters");
const resultsCount = document.getElementById("resultsCount");

function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const season = seasonFilter.value;
  const radius = radiusFilter.value;
  const width = widthFilter.value;
  const profile = profileFilter.value;
  const minPrice = Number(priceFrom.value);
  const maxPrice = Number(priceTo.value);
  const inStockOnly = inStockFilter.checked;

  const filtered = tires.filter(tire => {
    const title = `${tire.brand} ${tire.model}`.toLowerCase();
    const total =
                  (tire.stock ?? 0) +
                  (tire.showroom ?? 0) +
                  (tire.basement ?? 0);

    if (search && !title.includes(search)) return false;
    if (season === "winter" && tire.season !== "winter") return false;
    if (season === "summer-all" && !["summer", "all-season"].includes(tire.season)) return false;
    if (radius && tire.radius !== Number(radius)) return false;
    if (width && tire.width !== Number(width)) return false;
    if (profile && tire.profile !== Number(profile)) return false;
    if (inStockOnly && total <= 0) return false;
    if (minPrice && tire.price < minPrice) return false;
    if (maxPrice && tire.price > maxPrice) return false;

    return true;
  });

  resultsCount.textContent = `Знайдено шин: ${filtered.length}`;
  renderTires(filtered);
}

applyBtn.onclick = applyFilters;

resetBtn.onclick = () => {
  document
    .querySelectorAll(".filters input, .filters select")
    .forEach(el => (el.value = ""));
  inStockFilter.checked = false;
  resultsCount.textContent = "";
  renderTires(tires);
};

searchInput.oninput = applyFilters;
seasonFilter.onchange = applyFilters;
radiusFilter.onchange = applyFilters;

/* ======================
   EVENTS
====================== */
searchInput.addEventListener("input", applyFilters);
seasonFilter.addEventListener("change", applyFilters);
radiusFilter.addEventListener("change", applyFilters);

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

  if (API_BASE) candidates.add(API_BASE);
  candidates.add("");
  candidates.add("http://127.0.0.1:3000");
  candidates.add("http://localhost:3000");

  return [...candidates];
}

async function postOrder(payload) {
  const candidates = buildApiCandidates();
  let lastError = null;

  for (const base of candidates) {
    const endpoint = `${base}/api/order`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} @ ${endpoint}`);
      return res;
    } catch (err) {
      lastError = err;
      console.warn(`Order submit failed via ${endpoint}:`, err);
    }
  }

  throw lastError || new Error("Unable to reach backend");
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
  summaryAvailable.textContent = `${available} шт.`;

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
};

window.onclick = e => {
  if (e.target === modal) {
    modal.style.display = "none";
    selectedTire = null;
    checkoutForm.reset();
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

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

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

  } catch (err) {
    console.error("Order submit failed:", err);
    alert(
      "❌ Замовлення не відправлено. Перевірте, що backend запущений на http://127.0.0.1:3000 або http://localhost:3000"
    );
  }
};

/* ======================
   INIT
====================== */
renderTires(tires);
