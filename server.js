const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;
const DB_FILE = process.env.DB_FILE || "melange.db";

/* =========================
   НАСТРОЙКИ
========================= */

app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.use(express.static(__dirname));


/* =========================
   АВТОРИЗАЦИЯ
========================= */

const ADMIN_LOGIN =
  process.env.ADMIN_LOGIN || "employee";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.warn(
    "⚠️ ADMIN_PASSWORD не задан в Render Environment Variables"
  );
}


/*
  Временные токены авторизации.
  После перезапуска сервера они автоматически исчезают.
*/

const sessions = new Map();

const SESSION_TIME =
  12 * 60 * 60 * 1000;


/* Вход */

app.post("/api/admin/login", (req, res) => {

  const {
    login,
    password
  } = req.body;


  if (
    !ADMIN_PASSWORD ||
    login !== ADMIN_LOGIN ||
    password !== ADMIN_PASSWORD
  ) {

    return res.status(401).json({
      success: false,
      error: "Неверный логин или пароль"
    });

  }


  const token =
    crypto.randomBytes(32).toString("hex");


  sessions.set(token, {
    createdAt: Date.now()
  });


  res.json({
    success: true,
    token
  });

});


/* Проверка авторизации */

function requireAdmin(req, res, next) {

  const header =
    req.headers.authorization || "";


  if (!header.startsWith("Bearer ")) {

    return res.status(401).json({
      success: false,
      error: "Требуется авторизация"
    });

  }


  const token =
    header.substring(7);


  const session =
    sessions.get(token);


  if (!session) {

    return res.status(401).json({
      success: false,
      error: "Сессия недействительна"
    });

  }


  if (
    Date.now() - session.createdAt >
    SESSION_TIME
  ) {

    sessions.delete(token);

    return res.status(401).json({
      success: false,
      error: "Сессия истекла"
    });

  }


  next();

}


/* Выход */

app.post("/api/admin/logout", requireAdmin, (req, res) => {

  const token =
    req.headers.authorization.substring(7);

  sessions.delete(token);

  res.json({
    success: true
  });

});


/* =========================
   БАЗА ДАННЫХ
========================= */

const db =
  new Database(DB_FILE);

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

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});


/* =========================
   АДМИНКА
========================= */

app.get("/admin.html", (req, res) => {

  res.sendFile(
    path.join(__dirname, "admin.html")
  );

});


/* =========================
   ПРОВЕРКА СЕРВЕРА
========================= */

app.get("/api/health", (req, res) => {

  res.json({
    success: true,
    ok: true,
    message: "Melange server работает"
  });

});


/* =========================
   ПОЛУЧИТЬ ЗАКАЗЫ
========================= */

app.get(
  "/api/orders",
  requireAdmin,
  (req, res) => {

    try {

      const orders =
        db.prepare(`
          SELECT *
          FROM orders
          ORDER BY id DESC
        `).all();


      const result =
        orders.map(order => {

          let items = [];

          try {

            items =
              JSON.parse(order.items);

          } catch (error) {

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

            created_at:
              order.created_at

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

        error:
          "Не удалось получить заказы"

      });

    }

  }
);


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


    if (
      !name ||
      String(name).trim() === ""
    ) {

      return res.status(400).json({
        success: false,
        error: "Введите имя"
      });

    }


    if (
      !phone ||
      String(phone).trim() === ""
    ) {

      return res.status(400).json({
        success: false,
        error: "Введите номер телефона"
      });

    }


    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return res.status(400).json({
        success: false,
        error: "Корзина пуста"
      });

    }


    const numericTotal =
      Number(total);


    if (
      !Number.isFinite(numericTotal) ||
      numericTotal < 0
    ) {

      return res.status(400).json({
        success: false,
        error: "Неверная сумма заказа"
      });

    }


    if (
      !delivery ||
      String(delivery).trim() === ""
    ) {

      return res.status(400).json({
        success: false,
        error: "Не указан способ получения"
      });

    }


    const createdAt =
      new Date().toISOString();


    const result =
      db.prepare(`
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

        String(name).trim(),

        String(phone).trim(),

        JSON.stringify(items),

        numericTotal,

        String(delivery).trim(),

        address
          ? String(address).trim()
          : "",

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

      error: "Ошибка сервера"

    });

  }

});


/* =========================
   ИЗМЕНИТЬ СТАТУС
========================= */

app.post(
  "/api/orders/:id/status",
  requireAdmin,
  (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        req.body.status;


      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Неверный номер заказа"

        });

      }


      const allowedStatuses = [
        "Новый",
        "Готовится",
        "Готов",
        "Выдан"
      ];


      if (
        !allowedStatuses.includes(status)
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Недопустимый статус"

        });

      }


      const result =
        db.prepare(`
          UPDATE orders
          SET status = ?
          WHERE id = ?
        `).run(

          status,

          id

        );


      if (result.changes === 0) {

        return res.status(404).json({

          success: false,

          error:
            "Заказ не найден"

        });

      }


      res.json({

        success: true,

        message:
          "Статус изменён"

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
   ЗАПУСК
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Melange server запущен на порту ${PORT}`
    );

  }
);