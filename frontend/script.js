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
    {
      key: "winter",
      title: "Зимові шини",
      icon: "❄️",
      class: "season-winter"
    },
    {
      key: "summer",
      title: "Літні шини",
      icon: "☀️",
      class: "season-summer"
    },
    {
      key: "all-season",
      title: "Всесезонні шини",
      icon: "🌿",
      class: "season-all"
    }
  ];

  seasons.forEach(season => {
    const seasonTires = data.filter(t => t.season === season.key);
    if (seasonTires.length === 0) return;

    /* HEADER */
    const header = document.createElement("div");
    header.className = `season-header ${season.class}`;
    header.innerHTML = `
      <div class="season-title">
        <span class="season-icon">${season.icon}</span>
        <span>${season.title}</span>
      </div>
      <span class="season-count">${seasonTires.length} шт.</span>
    `;

    /* LIST */
    const list = document.createElement("div");
    list.className = "tire-list";

    seasonTires.forEach(tire => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <img src="${tire.image}" alt="${tire.brand} ${tire.model}">
        <div class="card-body">
          <h3>${tire.brand} ${tire.model}</h3>
          <p>Size: ${tire.width}/${tire.profile} R${tire.radius} ${tire.loadIndex}</p>
          <p class="price">${tire.price || "—"}</p>
          <p>In stock: ${tire.amount}</p>
        </div>
      `;

      const buyBtn = document.createElement("button");
      buyBtn.className = "buy-btn";
      buyBtn.textContent = tire.amount > 0 ? "Buy Now" : "Out of stock";
      buyBtn.disabled = tire.amount === 0;
      buyBtn.onclick = () => openCheckout(tire);

      card.appendChild(buyBtn);
      list.appendChild(card);
    });

    /* COLLAPSE / EXPAND */
    header.onclick = () => {
      list.classList.toggle("collapsed");
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

    if (search && !title.includes(search)) return false;
    if (season && tire.season !== season) return false;
    if (radius && tire.radius !== Number(radius)) return false;
    if (width && tire.width !== Number(width)) return false;
    if (profile && tire.profile !== Number(profile)) return false;
    if (inStockOnly && tire.amount <= 0) return false;

    if (minPrice && tire.price < minPrice) return false;
    if (maxPrice && tire.price > maxPrice) return false;

    return true;
  });

  resultsCount.textContent = `Знайдено шин: ${filtered.length}`;
  renderTires(filtered);
}

applyBtn.addEventListener("click", applyFilters);

resetBtn.addEventListener("click", () => {
  document.querySelectorAll(".filters input, .filters select")
    .forEach(el => el.value = "");
  inStockFilter.checked = false;
  resultsCount.textContent = "";
  renderTires(tires);
});


/* ======================
   EVENTS
====================== */
searchInput.addEventListener("input", applyFilters);
seasonFilter.addEventListener("change", applyFilters);
radiusFilter.addEventListener("change", applyFilters);

/* ======================
   CHECKOUT MODAL
====================== */
function openCheckout(tire) {
  selectedTireText.textContent =
    `${tire.brand} ${tire.model} — ${tire.price || "—"}`;

  modal.style.display = "flex";
}

closeModal.onclick = () => {
  modal.style.display = "none";
};

window.onclick = e => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
};

checkoutForm.onsubmit = async e => {
  e.preventDefault();

  const name = checkoutForm[0].value;
  const phone = checkoutForm[1].value;

  try {
    const res = await fetch("http://localhost:3000/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tire: selectedTireText.textContent,
        customer: name,
        phone
      })
    });

    if (!res.ok) throw new Error("Server error");

    alert("Order sent!");
    modal.style.display = "none";
    checkoutForm.reset();

  } catch (err) {
    alert("❌ Order not sent. Backend is not running.");
    console.error(err);
  }
};

/* ======================
   INIT
====================== */
renderTires(tires);
