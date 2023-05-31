const mysql = require("mysql");
require("dotenv").config();

const pool = mysql.createPool({
  poolLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = function createTables() {
  // Products table
  pool.query("SELECT 1 FROM products LIMIT 1", (err, result) => {
    if (err) {
      const products = `CREATE TABLE products ( id INT NOT NULL AUTO_INCREMENT,
                  name VARCHAR(255) NOT NULL,
                     price DECIMAL(10, 2) NOT NULL,
                PRIMARY KEY (id) )`;
      pool.query(products, (err, result) => {
        if (err) throw err;
        console.log("Table products created ✅");
      });
    } else {
      console.log(`Table products exists ✅`);
    }
  });

  // User table
  pool.query("SELECT 1 FROM users LIMIT 1", (err, result) => {
    if (err) {
      const users = `CREATE TABLE users ( id INT NOT NULL AUTO_INCREMENT,
                  name VARCHAR(255) NOT NULL,
                     steamid DECIMAL(10, 2) NOT NULL,
                PRIMARY KEY (id) )`;
      pool.query(users, (err, result) => {
        if (err) throw err;
        console.log("Table users created ✅");
      });
    } else {
      console.log(`Table users exists ✅`);
    }
  });
};
