const CSV_PATH = "./data/tires.csv";
const DEFAULT_IMAGE = "./images/landingPage/flytire-vector.png";

function splitCsvLine(line) {
  return line
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(part => part.trim().replace(/^"|"$/g, ""));
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function detectSeason(description, sectionSeason) {
  const text = description.toLowerCase();

  if (sectionSeason === "winter") return "winter";
  if (text.includes("allseason") || text.includes("all season") || text.includes("4 season")) {
    return "all-season";
  }
  if (text.includes("winter") || text.includes("ice") || text.includes("snow")) {
    return "winter";
  }
  return "summer";
}

function parseTireLine(description, priceRaw, quantityRaw, sectionSeason) {
  if (!description || /^radius\s+\d+/i.test(description)) return null;

  const sizeMatch = description.match(/(\d{2,3})\/(\d{2,3})\s*R(\d{2})/i);
  if (!sizeMatch) return null;

  const [, width, profile, radius] = sizeMatch;
  const loadIndexMatch = description.match(/\bR\d{2}[A-Z]?\s+([0-9]{2,3}(?:\/[0-9]{2,3})?[A-Z]{0,2})/i);

  const cleaned = description
    .replace(/\(.*?\)/g, "")
    .replace(sizeMatch[0], "")
    .replace(loadIndexMatch?.[0] ?? "", "")
    .trim()
    .replace(/\s+/g, " ");

  const [brand = "", ...modelParts] = cleaned.split(" ");
  if (!brand) return null;

  const quantity = Number.parseInt(String(quantityRaw).replace(/[^\d-]/g, ""), 10);

  return {
    brand,
    model: modelParts.join(" ").trim(),
    width: Number(width),
    profile: Number(profile),
    radius: Number(radius),
    loadIndex: loadIndexMatch ? loadIndexMatch[1] : "",
    season: detectSeason(description, sectionSeason),
    price: parseNumber(priceRaw, 0),
    stock: 0,
    basement: 0,
    showroom: Number.isFinite(quantity) ? Math.max(quantity, 0) : 0,
    amount: 0,
    image: DEFAULT_IMAGE
  };
}

function parseCsvToTires(csvText) {
  const lines = csvText.split("\n").map(line => line.trim()).filter(Boolean);
  let sectionSeason = "summer";
  const parsed = [];

  lines.forEach(line => {
    if (/літо-?всесезонні/i.test(line)) {
      sectionSeason = "summer";
      return;
    }
    if (/зим/i.test(line)) {
      sectionSeason = "winter";
      return;
    }

    const [description, priceRaw, quantityRaw] = splitCsvLine(line);
    const tire = parseTireLine(description, priceRaw, quantityRaw, sectionSeason);
    if (tire) parsed.push(tire);
  });

  return parsed;
}

function resolveApiBase() {
  const { hostname, port, protocol } = window.location;
  const isLocalHost = ["localhost", "127.0.0.1"].includes(hostname);

  if (protocol === "file:") return "http://127.0.0.1:3000";
  if (isLocalHost && port !== "3000") return "http://127.0.0.1:3000";
  return "";
}

async function loadTiresFromApi() {
  const apiBase = resolveApiBase();
  const response = await fetch(`${apiBase}/api/tires`);
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити прайс з пошти: ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.tires)) {
    throw new Error("Формат відповіді /api/tires неочікуваний");
  }

  return payload.tires.map(tire => ({
    ...tire,
    image: tire.image || DEFAULT_IMAGE
  }));
}

async function loadTiresFromCsv() {
  const response = await fetch(CSV_PATH);
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити ${CSV_PATH}: ${response.status}`);
  }

  const csvText = await response.text();
  return parseCsvToTires(csvText);
}

export async function loadTires() {
  try {
    return await loadTiresFromApi();
  } catch (error) {
    console.warn("Не вдалося завантажити прайс з пошти, використовую локальний CSV:", error);
    return loadTiresFromCsv();
  }
}
