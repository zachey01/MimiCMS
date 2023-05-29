// TODO: Create other tables here
const express = require("express");
const app = express();
const mysql = require("mysql");
require("dotenv").config();
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL database");

  // ! Example create new table
  /* const sql = `CREATE TABLE products ( id INT NOT NULL AUTO_INCREMENT, 
        name letCHAR(255) NOT NULL, 
        price DECIMAL(10, 2) NOT NULL, 
        PRIMARY KEY (id) )`;
    connection.query(sql, (err, result) => {
      if (err) throw err;
    console.log('Table created');
   });
  */

  const user = { id: "1", name: "john@example.com", price: "50" };
  connection.query(
    "INSERT INTO products SET ?",
    user,
    (error, results, fields) => {
      if (error) {
        console.log("Error adding new product");
      } else {
        console.log("User added to database");
      }
    }
  );
});
app.get("/api/products", (req, res) => {
  connection.query("SELECT * FROM products", (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
app.post("/api/products", (req, res) => {
  const product = req.body;
  connection.query("INSERT INTO products SET ?", product, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
app.get("/api/orders", (req, res) => {
  connection.query("SELECT * FROM orders", (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
app.post("/api/orders", (req, res) => {
  const order = req.body;
  connection.query("INSERT INTO orders SET ?", order, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
app.get("/api/users", (req, res) => {
  connection.query("SELECT * FROM users", (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
app.post("/api/users", (req, res) => {
  const user = req.body;
  connection.query("INSERT INTO users SET ?", user, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({ error: { message: error.message } });
});
const port = process.env.BACKEND_PORT;
app.listen(port, () => console.log(`Server started on port ${port}`));
