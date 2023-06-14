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
    console.error("Database connection error: " + err.stack);
    return;
  }
  console.log("Connection to the data base is successfully established");
  createTables();
});

module.exports = pool;
