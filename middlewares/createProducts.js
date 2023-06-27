const mysql = require("mysql");
const fs = require("fs");
const chokidar = require("chokidar");
require("dotenv").config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Функция для создания продуктов в базе данных
function createProducts(products) {
  // Перебираем все продукты
  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Проверяем, есть ли продукт с таким же id в базе данных
    pool.query(
      `SELECT * FROM products WHERE id = ${product.id}`,
      (err, rows) => {
        if (err) throw err;

        // Если продукт найден, то обновляем данные в базе данных
        if (rows.length > 0) {
          pool.query(
            "UPDATE products SET name = ?, price = ?, description = ?, givecmd = ?, img = ?, tags = ? WHERE id = ?",
            [
              product.name,
              product.price,
              product.description,
              product.givecmd,
              product.img,
              product.tags,
              product.id,
            ],
            (err, result) => {
              if (err) throw err;
            }
          );
        } else {
          // Иначе добавляем новый продукт в базу данных
          pool.query(
            "INSERT INTO products (id, name, price, description, givecmd, img, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              product.id,
              product.name,
              product.price,
              product.description,
              product.givecmd,
              product.img,
              product.tags,
            ],
            (err, result) => {
              if (err) throw err;
            }
          );
        }
      }
    );
  }
}
// Экспортируем функцию createProducts
module.exports = createProducts;

// Отслеживаем изменения в файле
chokidar.watch("data/products.json").on("change", () => {
  // Загружаем данные из JSON-файла
  const products = JSON.parse(fs.readFileSync("data/products.json"));
  // Создаем или обновляем продукты в базе данных
  createProducts(products);
});

// Создаем или обновляем продукты в базе данных при запуске приложения
const products = JSON.parse(fs.readFileSync("data/products.json"));
createProducts(products);
