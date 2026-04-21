import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COUNTER_FILE = path.join(__dirname, "orderCounter.json");

/* ======================
   CONFIG (.env)
====================== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("❌ Missing BOT_TOKEN or CHAT_ID in backend/.env");
  process.exit(1);
}

/* ======================
   APP INIT
====================== */
const app = express();
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

/* ======================
   MIDDLEWARE
====================== */
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || LOCAL_ORIGIN_RE.test(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    optionsSuccessStatus: 204
  })
);

app.use(express.json());
app.use(express.static(FRONTEND_DIR));

/* ======================
   HELPERS
====================== */
function getNextOrderId() {
  let data = { lastNumber: 0 };

  try {
    const raw = fs.readFileSync(COUNTER_FILE, "utf-8");
    data = JSON.parse(raw);
  } catch {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
  }

  data.lastNumber += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `FTS-${today}-${String(data.lastNumber).padStart(3, "0")}`;
}

function formatDateTimeUA(date = new Date()) {
  return date.toLocaleString("uk-UA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildTelegramMessage(body) {
  const {
    orderId,
    orderDateTime,
    tire,
    size,
    loadIndex,
    price,
    quantity,
    total,
    customer,
    phone,
    available
  } = body;

  const p = Number(price);
  const q = Number(quantity);
  const t = Number(total);
  const a = Number(available);

  return (
    `🛞 <b>НОВЕ ЗАМОВЛЕННЯ — Fly Tire Shop</b>\n\n` +
    `🆔 <b>ID:</b> ${escapeHtml(orderId || "—")}\n` +
    `🕒 <b>Дата/час:</b> ${escapeHtml(orderDateTime || "—")}\n\n` +
    `🔹 <b>Шина:</b> ${escapeHtml(tire || "—")}\n` +
    `🔹 <b>Розмір:</b> ${escapeHtml(size || "—")} ${escapeHtml(loadIndex || "")}\n` +
    `🔹 <b>Ціна за 1 шт:</b> ${Number.isFinite(p) ? p.toFixed(2) : "—"} $\n` +
    `🔹 <b>Кількість:</b> ${Number.isFinite(q) ? q : "—"} шт\n` +
    `🔹 <b>Сума:</b> ${Number.isFinite(t) ? t.toFixed(2) : "—"} $\n\n` +
    `👤 <b>Клієнт:</b> ${escapeHtml(customer || "—")}\n` +
    `📞 <b>Телефон:</b> ${escapeHtml(phone || "—")}\n\n` +
    `📦 <b>В наявності:</b> ${Number.isFinite(a) ? a : 0} шт`
  );
}

function resolveAvailable(payload = {}) {
  const direct = Number(payload.available);
  if (Number.isFinite(direct)) return direct;

  const stock = Number(payload.stock ?? 0);
  const showroom = Number(payload.showroom ?? 0);
  const basement = Number(payload.basement ?? 0);
  const aggregated = stock + showroom + basement;

  if (Number.isFinite(aggregated) && aggregated > 0) return aggregated;
  return 0;
}

/* ======================
   ROUTES
====================== */
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "FlyTire backend" });
});

app.get("/api/test", async (req, res) => {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: "✅ Test message from FlyTire backend"
      })
    });

    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("❌ TEST ERROR:", err);
    res.status(500).json({ error: "Test failed" });
  }
});

app.post("/api/order", async (req, res) => {
  console.log("📥 Incoming order:", req.body);

  const { tire, size, loadIndex, price, quantity, total, customer, phone } = req.body;
  const available = resolveAvailable(req.body);

  if (!customer || !phone || !tire) {
    return res.status(400).json({ error: "Missing data" });
  }

  const orderId = getNextOrderId();
  const orderDateTime = formatDateTimeUA(new Date());

  const message = buildTelegramMessage({
    orderId,
    orderDateTime,
    tire,
    size,
    loadIndex,
    price,
    quantity,
    total,
    customer,
    phone,
    available
  });

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML"
      })
    });

    const tgData = await tgRes.json();

    if (!tgRes.ok) {
      console.error("❌ Telegram error:", tgData);
      return res.status(500).json({ error: "Telegram error", tgData });
    }

    return res.json({ success: true, orderId, orderDateTime });
  } catch (err) {
    console.error("❌ ORDER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});



app.get(/.*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

/* ======================
   START SERVER
====================== */
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ FlyTire site+backend: http://127.0.0.1:${PORT}`);
  console.log(`✅ Health: http://127.0.0.1:${PORT}/api/health`);
});
