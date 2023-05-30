const express = require("express");
const employees = require("./routes/employee");
const app = express();
const path = require("path");
const ejs = require("ejs");

app.set("view engine", "ejs");
require("dotenv").config();
const axios = require("axios");

// ! Routes

app.get("/products", async (req, res) => {
  try {
    const response = await axios.get(
      `http://localhost:${process.env.BACKEND_PORT}/api/products`
    );
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching data from API" });
  }
});

app.get("/", function (req, res) {
  res.render(path.join(__dirname, "views", "./index.ejs"), {
    name: process.env.NAME,
  });
});

// Starting the server
const port = process.env.FRONTEND_PORT || 3000;
app.listen(port, () => console.log(`Server started on port ${port}`));
