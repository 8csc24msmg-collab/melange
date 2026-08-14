const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;
const DB_FILE = process.env.DB_FILE || "melange.db";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

console.log("SERVER FILE:", __filename);
console.log("SERVER DIRECTORY:", __dirname);
const db = new Database(DB_FILE);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    delivery TEXT NOT NULL,
    address TEXT DEFAULT '',
    status TEXT DEFAULT 'Новый',
    created_at TEXT NOT NULL
  )
`);


/* =========================
   ГЛАВНАЯ
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


/* =========================
   ПРОВЕРКА СЕРВЕРА
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Melange server работает"
  });
});


/* =========================
   ПОЛУЧИТЬ ЗАКАЗЫ
========================= */

app.get("/api/orders", (req, res) => {

  try {

    const orders = db.prepare(`
      SELECT *
      FROM orders
      ORDER BY id DESC
    `).all();

    const result = orders.map(order => {

      let items = [];

      try {
        items = JSON.parse(order.items);
      } catch {
        items = [];
      }

      return {
        ...order,
        items
      };

    });

    res.json(result);

  } catch (error) {

    console.error("Ошибка получения заказов:", error);

    res.status(500).json({
      success: false,
      error: "Не удалось получить заказы"
    });

  }

});


/* =========================
   СОЗДАТЬ ЗАКАЗ
========================= */

app.post("/api/orders", (req, res) => {

  try {

    const {
      name,
      phone,
      items,
      total,
      delivery,
      address
    } = req.body;


    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Не указано имя"
      });
    }


    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Не указан телефон"
      });
    }


    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Корзина пуста"
      });
    }


    if (!Number.isFinite(Number(total))) {
      return res.status(400).json({
        success: false,
        error: "Неверная сумма"
      });
    }


    if (!delivery) {
      return res.status(400).json({
        success: false,
        error: "Не указан способ получения"
      });
    }


    const createdAt =
      new Date().toISOString();


    const result = db.prepare(`
      INSERT INTO orders (
        name,
        phone,
        items,
        total,
        delivery,
        address,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(name),
      String(phone),
      JSON.stringify(items),
      Number(total),
      String(delivery),
      address ? String(address) : "",
      "Новый",
      createdAt
    );


    console.log(
      `Новый заказ №${result.lastInsertRowid}`
    );


    res.status(201).json({
      success: true,
      orderId: result.lastInsertRowid,
      message: "Заказ успешно создан"
    });

  } catch (error) {

    console.error(
      "Ошибка создания заказа:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Ошибка сервера"
    });

  }

});


/* =========================
   ИЗМЕНИТЬ СТАТУС
========================= */

app.post("/api/orders/:id/status", (req, res) => {

  try {

    const id =
      Number(req.params.id);

    const status =
      req.body.status;


    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Неверный номер заказа"
      });
    }


    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Не указан статус"
      });
    }


    const result = db.prepare(`
      UPDATE orders
      SET status = ?
      WHERE id = ?
    `).run(
      String(status),
      id
    );


    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: "Заказ не найден"
      });
    }


    res.json({
      success: true,
      message: "Статус изменён"
    });

  } catch (error) {

    console.error(
      "Ошибка изменения статуса:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Ошибка сервера"
    });

  }

});


/* =========================
   ЗАПУСК
========================= */

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Melange server запущен на порту ${PORT}`
  );

});