import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as XLSX from "xlsx";
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

const MAIL_CONFIG = {
  host: process.env.IMAP_HOST,
  port: Number(process.env.IMAP_PORT || 993),
  secure: String(process.env.IMAP_SECURE || "true").toLowerCase() !== "false",
  user: process.env.IMAP_USER,
  pass: process.env.IMAP_PASS,
  mailbox: process.env.IMAP_MAILBOX || "[Gmail]/Sent Mail",
  subjectContains: process.env.IMAP_SUBJECT_CONTAINS || "",
  fromContains: process.env.IMAP_FROM_CONTAINS || "",
  attachmentNameContains: process.env.IMAP_ATTACHMENT_NAME_CONTAINS || "",
  maxMessagesToScan: Number(process.env.IMAP_MAX_MESSAGES_TO_SCAN || 20)
};

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
  if (text.includes("winter") || text.includes("ice") || text.includes("snow") || text.includes("зим")) {
    return "winter";
  }
  if (text.includes("moto") || text.includes("motorcycle") || text.includes("мото")) {
    return "moto";
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
    image: "./images/landingPage/flytire-vector.png"
  };
}

function normalizeRow(rawRow) {
  const values = Array.isArray(rawRow)
    ? rawRow
    : [rawRow?.description, rawRow?.price, rawRow?.quantity];

  const description = String(values[0] ?? "").trim();
  const priceRaw = values[1];
  const quantityRaw = values[2];

  return { description, priceRaw, quantityRaw };
}

function parseRowsToTires(rows) {
  let sectionSeason = "summer";
  const parsed = [];

  for (const rawRow of rows) {
    const { description, priceRaw, quantityRaw } = normalizeRow(rawRow);
    if (!description) continue;

    if (/літо-?всесезонні/i.test(description)) {
      sectionSeason = "summer";
      continue;
    }
    if (/зим/i.test(description)) {
      sectionSeason = "winter";
      continue;
    }
    if (/мото/i.test(description)) {
      sectionSeason = "moto";
      continue;
    }

    const tire = parseTireLine(description, priceRaw, quantityRaw, sectionSeason);
    if (tire) parsed.push(tire);
  }

  return parsed;
}

function parseExcelAttachment(contentBuffer) {
  const workbook = XLSX.read(contentBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("XLSX файл не містить листів");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  const tires = parseRowsToTires(rows);

  return {
    tires,
    sheetName: firstSheetName
  };
}

function ensureMailConfig() {
  const missing = ["host", "user", "pass"].filter(key => !MAIL_CONFIG[key]);
  if (missing.length) {
    throw new Error(`Missing mail config: ${missing.join(", ")}`);
  }
}

function pickAttachment(attachments = []) {
  const xlsxAttachments = attachments.filter(att => {
    const filename = String(att.filename || "").toLowerCase();
    const contentType = String(att.contentType || "").toLowerCase();
    return filename.endsWith(".xlsx") || contentType.includes("spreadsheet") || contentType.includes("excel");
  });

  if (!xlsxAttachments.length) return null;

  const wantedName = MAIL_CONFIG.attachmentNameContains.trim().toLowerCase();
  if (!wantedName) return xlsxAttachments[0];

  return (
    xlsxAttachments.find(att => String(att.filename || "").toLowerCase().includes(wantedName)) ||
    xlsxAttachments[0]
  );
}

async function fetchLatestPriceAttachment() {
  ensureMailConfig();

  const client = new ImapFlow({
    host: MAIL_CONFIG.host,
    port: MAIL_CONFIG.port,
    secure: MAIL_CONFIG.secure,
    auth: {
      user: MAIL_CONFIG.user,
      pass: MAIL_CONFIG.pass
    }
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock(MAIL_CONFIG.mailbox);
    try {
      const total = client.mailbox.exists || 0;
      if (!total) {
        throw new Error(`Mailbox ${MAIL_CONFIG.mailbox} is empty`);
      }

      const fromSeq = Math.max(1, total - MAIL_CONFIG.maxMessagesToScan + 1);

      for await (const message of client.fetch(`${fromSeq}:*`, {
        uid: true,
        envelope: true,
        source: true
      })) {
        const parsed = await simpleParser(message.source);
        const subject = String(parsed.subject || "");
        const fromAddress = String(parsed.from?.text || "");

        if (
          MAIL_CONFIG.subjectContains &&
          !subject.toLowerCase().includes(MAIL_CONFIG.subjectContains.toLowerCase())
        ) {
          continue;
        }

        if (
          MAIL_CONFIG.fromContains &&
          !fromAddress.toLowerCase().includes(MAIL_CONFIG.fromContains.toLowerCase())
        ) {
          continue;
        }

        const attachment = pickAttachment(parsed.attachments || []);
        if (!attachment) continue;

        return {
          attachment,
          subject,
          from: fromAddress,
          date: parsed.date,
          uid: message.uid
        };
      }

      throw new Error("Не знайдено лист з XLSX вкладенням за заданими фільтрами");
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/* ======================
   ROUTES
====================== */
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "FlyTire backend" });
});

app.get("/api/tires", async (req, res) => {
  try {
    const emailData = await fetchLatestPriceAttachment();
    const parsed = parseExcelAttachment(emailData.attachment.content);

    res.json({
      source: "email-xlsx",
      meta: {
        mailbox: MAIL_CONFIG.mailbox,
        uid: emailData.uid,
        subject: emailData.subject,
        from: emailData.from,
        date: emailData.date,
        attachmentName: emailData.attachment.filename,
        sheetName: parsed.sheetName
      },
      tires: parsed.tires
    });
  } catch (error) {
    console.error("❌ TIRES SYNC ERROR:", error);
    res.status(500).json({
      error: "Не вдалося завантажити прайс з пошти",
      details: error.message
    });
  }
});

app.get("/api/test", async (req, res) => {
  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(400).json({ error: "BOT_TOKEN or CHAT_ID is missing in backend/.env" });
  }

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
  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(400).json({ error: "BOT_TOKEN or CHAT_ID is missing in backend/.env" });
  }

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
