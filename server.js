const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();

const PORT = process.env.PORT || 10000;
const DB_FILE = process.env.DB_FILE || "melange.db";

/* =========================
   CORS
========================= */

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());

/* =========================
   JSON
========================= */

app.use(express.json());

/* =========================
   DATABASE
========================= */

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

  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Melange Server</title>
    </head>

    <body style="
      font-family:Arial,sans-serif;
      background:#f8f1e9;
      color:#3d2b21;
      padding:30px;
    ">

      <h1>Melange 🤎</h1>

      <p>
        Сервер работает.
      </p>

      <p>
        API заказов:
        <a href="/api/orders">
          открыть
        </a>
      </p>

      <p>
        Проверка:
        <a href="/api/health">
          /api/health
        </a>
      </p>

    </body>
    </html>
  `);

});


/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {

  res.json({
    ok: true,
    service: "Melange",
    message: "Сервер работает",
    time: new Date().toISOString()
  });

});


/* =========================
   GET ORDERS
========================= */

app.get("/api/orders", (req, res) => {

  try {

    const orders = db.prepare(`
      SELECT
        id,
        name,
        phone,
        items,
        total,
        delivery,
        address,
        status,
        created_at
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
        id: order.id,
        name: order.name,
        phone: order.phone,
        items: items,
        total: order.total,
        delivery: order.delivery,
        address: order.address,
        status: order.status,
        created_at: order.created_at
      };

    });

    res.json(result);

  } catch (error) {

    console.error(
      "Ошибка получения заказов:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Не удалось получить заказы",
      details: error.message
    });

  }

});


/* =========================
   CREATE ORDER
========================= */

app.post("/api/orders", (req, res) => {

  console.log("Получен POST /api/orders");

  console.log(
    "Данные:",
    JSON.stringify(req.body, null, 2)
  );

  try {

    const {
      name,
      phone,
      items,
      total,
      delivery,
      address
    } = req.body || {};


    /* ИМЯ */

    if (
      typeof name !== "string" ||
      name.trim() === ""
    ) {

      return res.status(400).json({
        success: false,
        error: "Введите имя"
      });

    }


    /* ТЕЛЕФОН */

    if (
      typeof phone !== "string" ||
      phone.trim() === ""
    ) {

      return res.status(400).json({
        success: false,
        error: "Введите номер телефона"
      });

    }


    /* ТОВАРЫ */

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return res.status(400).json({
        success: false,
        error: "Корзина пуста"
      });

    }


    /* СУММА */

    const numericTotal =
      Number(total);

    if (
      !Number.isFinite(numericTotal) ||
      numericTotal <= 0
    ) {

      return res.status(400).json({
        success: false,
        error: "Неверная сумма заказа"
      });

    }


    /* ДОСТАВКА */

    if (
      typeof delivery !== "string" ||
      delivery.trim() === ""
    ) {

      return res.status(400).json({
        success: false,
        error: "Не указан способ получения"
      });

    }


    /* АДРЕС */

    const finalAddress =
      typeof address === "string"
        ? address.trim()
        : "";


    /* СОЗДАЁМ ЗАКАЗ */

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


    const result =
      statement.run(
        name.trim(),
        phone.trim(),
        JSON.stringify(items),
        numericTotal,
        delivery.trim(),
        finalAddress,
        "Новый",
        createdAt
      );


    const orderId =
      Number(result.lastInsertRowid);


    console.log(
      `Новый заказ №${orderId}`
    );


    res.status(201).json({

      success: true,

      orderId: orderId,

      message:
        "Заказ успешно создан"

    });


  } catch (error) {

    console.error(
      "ОШИБКА СОЗДАНИЯ ЗАКАЗА:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Ошибка сервера при создании заказа",

      details:
        error.message

    });

  }

});


/* =========================
   CHANGE ORDER STATUS
========================= */

app.post(
  "/api/orders/:id/status",
  (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        req.body?.status;


      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {

        return res.status(400).json({
          success: false,
          error: "Неверный ID заказа"
        });

      }


      if (
        typeof status !== "string" ||
        status.trim() === ""
      ) {

        return res.status(400).json({
          success: false,
          error: "Не указан статус"
        });

      }


      const result =
        db.prepare(`
          UPDATE orders
          SET status = ?
          WHERE id = ?
        `).run(
          status.trim(),
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
        error: "Ошибка сервера",
        details: error.message
      });

    }

  }
);


/* =========================
   404
========================= */

app.use((req, res) => {

  res.status(404).json({
    success: false,
    error: "Маршрут не найден",
    method: req.method,
    path: req.path
  });

});


/* =========================
   ERROR HANDLER
========================= */

app.use((error, req, res, next) => {

  console.error(
    "Необработанная ошибка:",
    error
  );

  res.status(500).json({
    success: false,
    error: "Внутренняя ошибка сервера",
    details: error.message
  });

});


/* =========================
   START
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Melange server запущен на порту ${PORT}`
    );

    console.log(
      `Database: ${DB_FILE}`
    );

  }
);