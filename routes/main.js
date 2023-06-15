let // Modules
  express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  router = express.Router();
(moment = require("moment")),
  (path = require("path")),
  (ejs = require("ejs")),
  ({
    Server,
    RCON,
    MasterServer,
  } = require("@fabricio-191/valve-server-query")),
  (winston = require("winston")),
  (expressWinston = require("express-winston"));
require("dotenv").config();

const pool = require("../config/db");

let authVars = {
  logo: process.env.LOGO,
  currency: process.env.CURRENCY || "$",
  slide_1: process.env.SLIDE_1 || "https://dummyimage.com/1920x720/000/fff",
  slide_2: process.env.SLIDE_2 || "https://dummyimage.com/1920x720/000/fff",
  slide_3: process.env.SLIDE_3 || "https://dummyimage.com/1920x720/000/fff",
  tgChannelLink: process.env.TG_LINK || "#",
  discordServerLink: process.env.DISCORD_LINK || "#",
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

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { time: `${moment().format("YYYY-MM-DD-HH-mm-ss")}` },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

function renderPage(req, res, userSteamID, fileName, nonAuthFileName) {
  if (userSteamID) {
    logger.info(`User with steamid ${userSteamID} is authenticated`);
    pool.query(
      `SELECT * FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) {
          logger.error("Error getting user info", { error });
          throw error;
        }
        const avatar = results[0].avatar;
        const balance = results[0].balance;
        const userName = results[0].name;
        authVars.avatar = avatar;
        authVars.balance = balance;
        authVars.steamid = userSteamID;
        authVars.userName = userName;
        authVars.steamLink = `https://steamcommunity.com/profiles/${userSteamID}`;
        pool.query("SELECT * FROM products", (error, results) => {
          if (error) {
            logger.error("Error getting products", { error });
            throw error;
          }
          authVars.products = results;
          res.render(
            path.join(__dirname, "../views", `./${fileName}.ejs`),
            authVars
          );
          logger.info(
            `Rendered ${fileName} page for user with steamid ${userSteamID}`
          );
        });
      }
    );
  } else {
    pool.query("SELECT * FROM products", (error, results) => {
      if (error) {
        logger.error("Error getting products", { error });
        throw error;
      }
      authVars.products = results;
      res.render(
        path.join(__dirname, "../views", `./${nonAuthFileName}.ejs`),
        authVars
      );
      logger.info(
        `Rendered ${nonAuthFileName} page for non-authenticated user`
      );
    });
  }
}

router.get("/", async function (req, res) {
  userSteamID = req.session.steamid;

  const server = await Server({
    ip: process.env.SERVER_IP,
    port: parseInt(process.env.SERVER_PORT, 10),
    timeout: 5000,
  });
  const infoServer = await server.getInfo();
  authVars.serverPing = infoServer.ping;
  authVars.serverPlayerCountOnline = await infoServer.players.online;
  authVars.serverPlayerCountMax = await infoServer.players.max;
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

router.get("/purchases", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "contacts", "nonAuthErr");
});

router.get("/balance", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "balance", "nonAuthErr");
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
      if (err) {
        logger.error("Error getting user balance", { error: err });
        throw err;
      }
      const balance = result[0].balance;
      if (balance < amount) {
        logger.warn(
          `User with steamid ${userSteamID} tried to debit ${amount} but has only ${balance} in balance`
        );
        res.status(400).send("Not enough balance");
        return;
      }
      pool.query(
        `UPDATE users SET balance = balance - ${amount}, purchases = CONCAT(purchases, ${productId}, ',') WHERE steamid = ${userSteamID}`,
        (error, results) => {
          if (error) {
            logger.error("Error updating user balance", { error });
            throw error;
          }
          res.send("Success");
          logger.info(
            `User with steamid ${userSteamID} debited ${amount} and purchased product ${productId}`
          );
        }
      );
    }
  );
});

module.exports = router;
