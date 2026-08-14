const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const db = new Database("melange.db");

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post("/api/orders", (req, res) => {
  const {
    name,
    phone,
    items,
    total,
    delivery,
    address
  } = req.body;

  if (!name || !phone || !items || !total) {
    return res.status(400).json({
      error: "Не хватает данных"
    });
  }

  const result = db.prepare(`
    INSERT INTO orders
    (name, phone, items, total, delivery, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name,
    phone,
    JSON.stringify(items),
    total,
    delivery,
    address || ""
  );

  res.json({
    success: true,
    orderId: result.lastInsertRowid
  });
});

app.get("/api/orders", (req, res) => {

  const orders = db.prepare(`
    SELECT *
    FROM orders
    ORDER BY id DESC
  `).all();

  res.json(orders);
});

app.patch("/api/orders/:id", (req, res) => {

  const { status } = req.body;

  db.prepare(`
    UPDATE orders
    SET status = ?
    WHERE id = ?
  `).run(status, req.params.id);

  res.json({
    success: true
  });
});

app.listen(PORT, () => {
  console.log(`Melange server started on port ${PORT}`);
});