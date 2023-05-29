const express = require("express");
const app = express();
require("dotenv").config();
const axios = require("axios");

// API роуты
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

// Запуск сервера
const port = process.env.FRONTEND_PORT || 3000;
app.listen(port, () => console.log(`Server started on port ${port}`));
