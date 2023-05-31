const express = require("express");
const app = express();
const mysql = require("mysql");
require("dotenv").config();
const winston = require("winston");
const pool = mysql.createPool({
  poolLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Create tables if they don't exist
const createTables = require("./tables");
pool.getConnection((err) => {
  createTables();
});

// Winston logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Middleware to log requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes for products
app.get("/api/products", (req, res) => {
  pool.query("SELECT * FROM products", (error, results) => {
    if (error) {
      logger.error(error);
      throw error;
    }
    res.json(results);
  });
});

app.post("/api/products", (req, res) => {
  const product = req.body;
  pool.query("INSERT INTO products SET ?", product, (error, results) => {
    if (error) {
      logger.error(error);
      throw error;
    }
    res.json(results);
  });
});

// Routes for orders
app.get("/api/orders", (req, res) => {
  pool.query("SELECT * FROM orders", (error, results) => {
    if (error) {
      logger.error(error);
      throw error;
    }
    res.json(results);
  });
});

app.post("/api/orders", (req, res) => {
  const order = req.body;
  pool.query("INSERT INTO orders SET ?", order, (error, results) => {
    if (error) {
      logger.error(error);
      throw error;
    }
    res.json(results);
  });
});

// Routes for users
app.get("/api/users", (req, res) => {
  pool.query("SELECT * FROM users", (error, results) => {
    if (error) {
      logger.error(error);
      throw error;
    }
    res.json(results);
  });
});

app.post("/api/users", (req, res) => {
  const user = req.body;
  pool.query("INSERT INTO users SET ?", user, (error, results) => {
    if (error) {
      logger.error(error);
      throw error;
    }
    res.json(results);
  });
});

// Middleware for handling 404 errors
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

// Middleware for handling all other errors
app.use((error, req, res, next) => {
  logger.error(error);
  res.status(error.status || 500);
  res.json({ error: { message: error.message } });
});

const port = process.env.BACKEND_PORT;
app.listen(port, () => console.log(`Server started on port ${port} ✅`));

// Log unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
