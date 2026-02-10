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
const selectedTireText = document.getElementById("selectedTire");
const checkoutForm = document.getElementById("checkoutForm");

/* ======================
   RENDER TIRES
====================== */
function renderTires(data) {
  gallery.innerHTML = "";

  const seasons = [
    { key: "winter", title: "Зимові шини", icon: "❄️", class: "season-winter" },
    { key: "summer", title: "Літні шини", icon: "☀️", class: "season-summer" },
    { key: "all-season", title: "Всесезонні шини", icon: "🌿", class: "season-all" }
  ];

  seasons.forEach(season => {
    const seasonTires = data.filter(t => t.season === season.key);
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
    if (season && tire.season !== season) return false;
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
const nameInput = checkoutForm.querySelector('input[name="name"]');
const phoneInput = checkoutForm.querySelector('input[name="phone"]');

function calcAvailable(tire) {
  return (tire.stock ?? 0) + (tire.showroom ?? 0) + (tire.basement ?? 0);
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} $`;
}

function updateTotalUI() {
  if (!selectedTire) {
    summaryTotal.textContent = "—";
    return;
  }

  const quantity = Number(qtyInput.value);
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

  updateTotalUI();

  modal.style.display = "flex";
}

qtyInput.addEventListener("input", () => {
  // не даємо вийти за max
  if (!selectedTire) return;

  const available = calcAvailable(selectedTire);
  let q = Number(qtyInput.value);

  if (!Number.isFinite(q)) q = 1;
  if (q < 1) q = 1;
  if (q > available) q = available;

  qtyInput.value = String(q);
  updateTotalUI();
});

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
  const quantity = Number(qtyInput.value);

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

  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tire: `${selectedTire.brand} ${selectedTire.model}`,
        size: `${selectedTire.width}/${selectedTire.profile} R${selectedTire.radius}`,
        price,
        quantity,
        total,
        customer: name,
        phone
      })
    });

    if (!res.ok) throw new Error();

    alert("✅ Замовлення відправлено!");
    modal.style.display = "none";
    selectedTire = null;
    checkoutForm.reset();

  } catch {
    alert("❌ Замовлення не відправлено. Backend не запущений.");
  }
};

/* ======================
   INIT
====================== */
renderTires(tires);
