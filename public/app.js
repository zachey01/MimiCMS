const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs");
require("dotenv").config();
const axios = require("axios");

app.use(express.static("./public/public"));
app.set("view engine", "ejs");

let vars = {
  currency: process.env.CURRENCY,
  slide_1: process.env.SLIDE_1,
  slide_2: process.env.SLIDE_2,
  slide_3: process.env.SLIDE_3,
  tg_channel: process.env.TG_CHANNEL,
  discord_server_id: process.env.DISCORD_SERVER_ID,
  name: process.env.NAME,
  logo: process.env.LOGO,
};

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
  res.render(path.join(__dirname, "views", "./index.ejs"), vars);
});

app.get("/shop", function (req, res) {
  res.render(path.join(__dirname, "views", "./shop.ejs"), vars);
});

app.get("/tickets", function (req, res) {
  res.render(path.join(__dirname, "views", "./tickets.ejs"), vars);
});

app.get("/forum", function (req, res) {
  res.render(path.join(__dirname, "views", "./forum.ejs"), vars);
});

app.get("/profile", function (req, res) {
  res.render(path.join(__dirname, "views", "./user-profile.ejs"), vars);
});

app.get("/settings", function (req, res) {
  res.render(path.join(__dirname, "views", "./user-settings.ejs"), vars);
});

app.get("/balance", function (req, res) {
  res.render(path.join(__dirname, "views", "./balance.ejs"), vars);
});

app.get("/admin", function (req, res) {
  res.render(path.join(__dirname, "views", "./admin-main.ejs"), vars);
});

// Starting the server
const port = process.env.FRONTEND_PORT || 3000;
app.listen(port, () => console.log(`Server started on port ${port} ✅`));
