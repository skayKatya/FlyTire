import express from "express";
import fetch from "node-fetch";
import cors from "cors";

/* ======================
   CONFIG
====================== */

const BOT_TOKEN = "8433619978:AAGDTceNMRWNJwghLT5r9KdlFAmod5nESPI";
const CHAT_ID = 697456814;

// frontend, з якого дозволяємо запити
const FRONTEND_ORIGIN = "http://127.0.0.1:5500";

/* ======================
   APP INIT
====================== */

const app = express();

/* ======================
   MIDDLEWARE
====================== */

// CORS — правильно, без wildcard
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

// парсинг JSON
app.use(express.json());

/* ======================
   ROUTES
====================== */

// health-check 
app.get("/", (req, res) => {
  res.json({ status: "OK", service: "FlyTire backend" });
});

// test Telegram
app.get("/test", async (req, res) => {
  try {
    const r = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: "✅ Test message from FlyTire backend"
        })
      }
    );

    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("❌ TEST ERROR:", err);
    res.status(500).json({ error: "Test failed" });
  }
});

// MAIN ORDER ENDPOINT
app.post("/order", async (req, res) => {
  const { tire, customer, phone } = req.body;

  console.log("📥 Incoming order:", req.body);

  // базова валідація
  if (!tire || !customer || !phone) {
    return res.status(400).json({ error: "Missing data" });
  }

  const message =
    `🛞 NEW ORDER\n\n` +
    `Tire: ${tire}\n` +
    `Customer: ${customer}\n` +
    `Phone: ${phone}`;

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message
        })
      }
    );

    const tgData = await tgRes.json();
    console.log("📤 Telegram response:", tgData);

    if (!tgRes.ok) {
      return res.status(500).json({
        error: "Telegram error",
        tgData
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ ORDER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================
   START SERVER
====================== */

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`✅ FlyTire backend running on http://localhost:${PORT}`);
});
