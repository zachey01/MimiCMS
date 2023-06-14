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
  currency: process.env.CURRENCY || "$",
  slide_1: process.env.SLIDE_1 || "https://dummyimage.com/1920x720/000/fff",
  slide_2: process.env.SLIDE_2 || "https://dummyimage.com/1920x720/000/fff",
  slide_3: process.env.SLIDE_3 || "https://dummyimage.com/1920x720/000/fff",
  tg_channel: process.env.TG_CHANNEL,
  discord_server_id: process.env.DISCORD_SERVER_ID,
  name: process.env.NAME || "MimiCMS",
  tg_token: process.env.TG_BOT_TOKEN,
  tg_group: process.env.TG_GROUP_ID,
  steamid: null,
  avatar: null,
  balance: null,
  userName: null,
  steamLink: null,
  products: null,
  // Server information
  serverPing: null,
  serverPlayerCountOnline: null,
  serverPlayerCountMax: null,
  serverPlayers: null,
  serverMap: null,
  serverName: null,
  serverDescription: null,
};

function renderPage(req, res, userSteamID, fileName, nonAuthFileName) {
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
        path.join(__dirname, "../views", `./${nonAuthFileName}.ejs`),
        authVars
      );
    });
  }
}

router.get("/", async function (req, res) {
  userSteamID = req.session.steamid;

  const server = await Server({
    ip: "144.76.119.139",
    port: 27015,
    timeout: 5000,
  });
  const infoServer = await server.getInfo();
  authVars.serverPing = infoServer.ping;
  authVars.serverPlayerCountOnline = await infoServer.players.online;
  authVars.serverPlayerCountMax = await infoServer.players.max;
  authVars.serverPlayers = await server.getPlayers();
  authVars.serverMap = infoServer.map;
  authVars.serverName = infoServer.name;
  authVars.serverDescription = process.env.SERVER_DESCRIPTION;

  renderPage(req, res, userSteamID, "index", "nonAuthIndex");
});

router.get("/shop", function (req, res) {
  userSteamID = req.session.steamid;

  renderPage(req, res, userSteamID, "products", "nonAuthproducts");
});

router.get("/profile", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "user-profile", "nonAuthErr");
});

router.get("/tickets", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "tickets", "nonAuthErr");
});

router.get("/rules", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "rules", "nonAuthrules");
});

router.get("/contacts", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "contacts", "nonAuthcontacts");
});

// 404 page
router.get("*", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "404", "nonAuth404");
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
