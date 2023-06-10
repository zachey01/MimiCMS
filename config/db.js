const mysql = require("mysql");
require("dotenv").config();
const createTables = require("../modules/createTables");
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.getConnection((err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных: " + err.stack);
    return;
  }
  console.log("Подключение к базе данных успешно установлено");
  createTables();
});

module.exports = pool;
