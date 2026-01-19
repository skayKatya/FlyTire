import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/test", async (req, res) => {
  const tgUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

  const r = await fetch(tgUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.CHAT_ID,
      text: "✅ Test message from server"
    })
  });

  const data = await r.json();
  console.log("📨 TEST RESULT:", data);
  res.json(data);
});


app.post("/order", async (req, res) => {
  const { tire, customer, phone } = req.body;

  console.log("📥 Incoming order:", req.body);

  if (!tire || !customer || !phone) {
    return res.status(400).json({ error: "Missing data" });
  }

  const message =
    `🛞 New order!\n\n` +
    `Tire: ${tire}\n` +
    `Customer: ${customer}\n` +
    `Phone: ${phone}`;

  const tgUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

  try {
    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text: message
      })
    });

    const tgData = await tgRes.json();
    console.log("📤 Telegram response:", tgData);

    if (!tgRes.ok) {
      return res.status(500).json({ error: "Telegram error", tgData });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Telegram fetch failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.listen(3000, () => {
  console.log("✅ Backend running on http://localhost:3000");
});
