const mysql = require("mysql");
require("dotenv").config();
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = function createProducts() {
  const product = {
    id: 1,
    name: "Invisible",
    price: 130,
    description: "You can invisible",
    givecmd: "invisible",
    img: "img/logo.png",
    tags: "skin",
  };

  // Проверяем, есть ли продукт с таким же id в базе данных
  pool.query("SELECT * FROM products WHERE id = ?", product.id, (err, rows) => {
    if (err) throw err;

    // Если продукт найден, то выводим сообщение в консоль
    if (rows.length > 0) {
      console.log("Продукт был уже создан");
    } else {
      // Иначе добавляем новый продукт в базу данных
      pool.query("INSERT INTO products SET ?", product, (err, result) => {
        if (err) throw err;
        console.log("Продукт успешно создан");
      });
    }
  });
};
