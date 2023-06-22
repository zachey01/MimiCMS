const mysql = require("mysql");
const fs = require("fs");
require("dotenv").config();
const createTables = require("../middlewares/createTables");
const createProducts = require("../middlewares/createProducts");
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.getConnection((err) => {
  if (err) {
    console.error("Database connection error: " + err.stack);
    return;
  }
  console.log("Connection to the data base is successfully established");

  // Загружаем данные из JSON-файла
  const products = JSON.parse(fs.readFileSync("data/products.json"));

  // Создаем или обновляем продукты в базе данных
  createProducts(products);
});

module.exports = pool;
