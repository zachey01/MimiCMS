const mysql = require("mysql");
const fs = require("fs");
require("dotenv").config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = function createProducts() {
  // Загружаем данные из JSON-файла
  const products = JSON.parse(fs.readFileSync("data/products.json"));

  // Перебираем все продукты
  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Проверяем, есть ли продукт с таким же id в базе данных
    pool.query(
      `SELECT * FROM products WHERE id = ${product.id}`,
      (err, rows) => {
        if (err) throw err;

        // Если продукт найден, то выводим сообщение в консоль
        if (rows.length > 0) {
          console.log(`Продукт ${product.name} уже создан`);
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
              console.log(`Продукт ${product.name} успешно создан`);
            }
          );
        }
      }
    );
  }
};
