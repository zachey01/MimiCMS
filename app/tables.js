const mysql = require("mysql");
require("dotenv").config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Products table
pool.getConnection((err, connection) => {
  if (err) throw err;
  connection.query("SELECT 1 FROM products LIMIT 1", (err, result) => {
    if (err) {
      const products = `CREATE TABLE products (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        PRIMARY KEY (id)
      )`;
      connection.query(products, (err, result) => {
        if (err) throw err;
        console.log("Table products created ✅");
      });
    } else {
      console.log(`Table products exists ✅`);
    }
    connection.release();
  });
});

// User table
pool.getConnection((err, connection) => {
  if (err) throw err;
  connection.query("SELECT 1 FROM users LIMIT 1", (err, result) => {
    if (err) {
      const users = `CREATE TABLE users (
        steamid VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        balance INT NOT NULL DEFAULT 10,
        PRIMARY KEY (steamid)
      )`;
      connection.query(users, (err, result) => {
        if (err) throw err;
        console.log("Table users created ✅");
      });
    } else {
      console.log(`Table users exists ✅`);
    }
    connection.release();
  });
});

// Message table
pool.getConnection((err, connection) => {
  if (err) throw err;
  connection.query("SELECT 1 FROM messages LIMIT 1", (err, result) => {
    if (err) {
      const users = `CREATE TABLE messages (
        id INT NOT NULL AUTO_INCREMENT,
        message TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      );`;
      connection.query(users, (err, result) => {
        if (err) throw err;
        console.log("Table messages created ✅");
      });
    } else {
      console.log(`Table messages exists ✅`);
    }
    connection.release();
  });
});

pool.getConnection((err, connection) => {
  if (err) throw err;
  connection.query("SELECT 1 FROM topics LIMIT 1", (err, result) => {
    if (err) {
      const users = `CREATE TABLE IF NOT EXISTS topics (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
      connection.query(users, (err, result) => {
        if (err) throw err;
        console.log("Table topics created ✅");
      });
    } else {
      console.log(`Table topics exists ✅`);
    }
    connection.release();
  });
});

pool.getConnection((err, connection) => {
  if (err) throw err;
  connection.query("SELECT 1 FROM comments LIMIT 1", (err, result) => {
    if (err) {
      const users = `CREATE TABLE IF NOT EXISTS comments (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        topic_id INT(11) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        rating INT(11) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      )`;
      connection.query(users, (err, result) => {
        if (err) throw err;
        console.log("Table comments created ✅");
      });
    } else {
      console.log(`Table comments exists ✅`);
    }
    connection.release();
  });
});
