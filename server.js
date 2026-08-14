const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();

const PORT = process.env.PORT || 10000;
const DB_FILE = process.env.DB_FILE || "melange.db";

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

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
    address TEXT,
    status TEXT DEFAULT 'Новый',
    created_at TEXT NOT NULL
  )
`);


/* ГЛАВНАЯ */

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Melange Server</title>
      </head>
      <body style="
        font-family:Arial;
        padding:30px;
        background:#f8f1e9;
        color:#3d2b21;
      ">
        <h1>Melange 🤎</h1>
        <p>Сервер работает.</p>
        <p>Заказы: <a href="/api/orders">/api/orders</a></p>
      </body>
    </html>
  `);
});


/* ПРОВЕРКА СЕРВЕРА */

app.get("/api/health", (req, res) => {

  res.json({
    ok: true,
    message: "Melange server работает"
  });

});


/* ПОЛУЧИТЬ ЗАКАЗЫ */

app.get("/api/orders", (req, res) => {

  try {

    const orders = db.prepare(`
      SELECT *
      FROM orders
      ORDER BY id DESC
    `).all();

    const result = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));

    res.json(result);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Не удалось получить заказы"
    });

  }

});


/* СОЗДАТЬ ЗАКАЗ */

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


    /* ПРОВЕРКА */

    if (!name) {

      return res.status(400).json({
        error: "Не указано имя"
      });

    }

    if (!phone) {

      return res.status(400).json({
        error: "Не указан телефон"
      });

    }

    if (!Array.isArray(items) || items.length === 0) {

      return res.status(400).json({
        error: "Корзина пуста"
      });

    }

    if (!Number.isFinite(Number(total))) {

      return res.status(400).json({
        error: "Неверная сумма"
      });

    }

    if (!delivery) {

      return res.status(400).json({
        error: "Не указан способ получения"
      });

    }


    /* СОХРАНЯЕМ */

    const createdAt =
      new Date().toISOString();


    const statement = db.prepare(`
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
    `);


    const result = statement.run(
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

    console.error("Ошибка создания заказа:", error);

    res.status(500).json({
      error: "Ошибка сервера"
    });

  }

});


/* ИЗМЕНИТЬ СТАТУС ЗАКАЗА */

app.post("/api/orders/:id/status", (req, res) => {

  try {

    const id = Number(req.params.id);

    const status = req.body.status;

    if (!id || !status) {

      return res.status(400).json({
        error: "Не указан заказ или статус"
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
        error: "Заказ не найден"
      });

    }


    res.json({
      success: true
    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Ошибка сервера"
    });

  }

});


/* ЗАПУСК */

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Melange server запущен на порту ${PORT}`
  );

});