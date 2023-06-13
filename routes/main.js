let express = require("express"),
  mysql = require("mysql"),
  session = require("express-session"),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query"),
  router = express.Router();
require("dotenv").config();

const pool = require("../config/db");

let authVars = {
  logo: process.env.LOGO,
  currency: process.env.CURRENCY,
  slide_1: process.env.SLIDE_1,
  slide_2: process.env.SLIDE_2,
  slide_3: process.env.SLIDE_3,
  tg_channel: process.env.TG_CHANNEL,
  discord_server_id: process.env.DISCORD_SERVER_ID,
  name: process.env.NAME,
  tg_token: process.env.TG_BOT_TOKEN,
  tg_group: process.env.TG_GROUP_ID,
  steamid: "",
  avatar: "",
  balance: "",
  userName: "",
  steamLink: "",
  products: "",
};

function renderPage(req, res, userSteamID, fileName) {
  if (userSteamID) {
    console.log(userSteamID);
    pool.query(
      `SELECT * FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) throw error;
        const avatar = results[0].avatar;
        const balance = results[0].balance;
        const userName = results[0].name;
        authVars.avatar = avatar;
        authVars.balance = balance;
        authVars.steamid = userSteamID;
        authVars.userName = userName;
        authVars.steamLink = `https://steamcommunity.com/profiles/${userSteamID}`;
        pool.query("SELECT * FROM products", (error, results) => {
          if (error) throw error;
          authVars.products = results;
          res.render(
            path.join(__dirname, "../views", `./${fileName}.ejs`),
            authVars
          );
        });
      }
    );
  } else {
    pool.query("SELECT * FROM products", (error, results) => {
      if (error) throw error;
      authVars.products = results;
      res.render(
        path.join(__dirname, "../views", `./nonAuth${fileName}.ejs`),
        authVars
      );
    });
  }
}

router.get("/", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "index");
});

router.get("/shop", function (req, res) {
  userSteamID = req.session.steamid;

  renderPage(req, res, userSteamID, "products");
});

router.get("/profile", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "user-profile");
});

router.get("/tickets", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "tickets");
});

router.get("/rules", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "rules");
});

router.get("/contacts", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "contacts");
});

// 404 page
router.get("*", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "404");
});

router.post("/debit/:amount/:productId", (req, res) => {
  userSteamID = req.session.steamid;
  const amount = parseInt(req.params.amount);
  const productId = parseInt(req.params.productId);
  if (isNaN(amount)) {
    res.status(400).send("Invalid amount");
    return;
  }
  pool.query(
    `SELECT balance FROM users WHERE steamid = ${userSteamID}`,
    (err, result) => {
      if (err) throw err;
      const balance = result[0].balance;
      if (balance < amount) {
        console.log("Нету");
        res.status(400).send("Not enough balance");
        return;
      }
      pool.query(
        `UPDATE users SET balance = balance - ${amount}, purchases = CONCAT(purchases, ${productId}, ',') WHERE steamid = ${userSteamID}`,
        (error, results) => {
          if (error) throw error;
          res.send("Success");
        }
      );
    }
  );
});

module.exports = router;
