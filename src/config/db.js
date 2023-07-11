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
  createTables();
  const products = JSON.parse(fs.readFileSync("./src/data/products.json"));
  createProducts(products);
});

module.exports = pool;
