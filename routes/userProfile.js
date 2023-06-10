let express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  path = require("path"),
  // http = require("http").createServer(app),
  // io = require("socket.io")(http),
  ejs = require("ejs");
require("dotenv").config();
const router = express.Router();
const pool = require("../config/db");

let userSteamID;
let userAvatar;
let userName;

passport.use(
  new SteamStrategy(
    {
      returnURL: "http://localhost:3000/auth/steam/return",
      realm: `http://localhost:3000/`,
      apiKey: process.env.STEAM_API_KEY,
    },
    (identifier, profile, done) => {
      const steam = new SteamWebAPI({ apiKey: process.env.STEAM_API_KEY });
      steam.getPlayerSummaries({
        steamids: profile.id,
        callback: (err, data) => {
          if (err) {
            console.error(
              "Ошибка получения данных о пользователе: " + err.stack
            );
            return done(err);
          }
          pool.query(
            "INSERT IGNORE INTO users SET ?",
            {
              steamid: profile.id,
              name: profile.displayName,
              avatar: data.response.players[0].avatarfull,
            },
            (err, result) => {
              if (err) {
                console.error(
                  "Ошибка записи данных о пользователе в базу данных: " +
                    err.stack
                );
                return done(err);
              }
              console.log(
                `Данные о ${profile.displayName} пользователе успешно записаны в базу данных`
              );
              // Сохраняем steam id пользователя
              userSteamID = profile.id;
              userName = profile.displayName;
              // Return outside of query callback
              return done(null, profile);
            }
          );
        },
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  pool.query("SELECT * FROM users WHERE steamid = ?", [id], (err, results) => {
    if (err) {
      console.error("Ошибка поиска пользователя в базе данных: " + err.stack);
      return done(err);
    }
    if (results.length === 0) {
      // Пользователь не найден
      return done(null, null);
    }
    // Пользователь найден, возвращаем его данные
    return done(null, results[0]);
  });
});

module.exports = {
  // Authenticate user via Steam
  auth(req, res) {
    if (req.isAuthenticated()) {
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  },

  // Log user out of the system
  logout(req, res) {
    userSteamID = null; // Reset user's steam id
    req.logout(); // Clear user's data from session
    res.redirect("/"); // Redirect to the main page
  },

  // Handle user return after Steam authentication
  returnPage(req, res) {
    if (req.isAuthenticated()) {
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  },
  profile(req, res) {
    // Проверяем, был ли пользователь аутентифицирован
    if (userSteamID) {
      // Если пользователь был аутентифицирован, получаем данные из базы данных
      pool.query(
        `SELECT avatar, balance FROM users WHERE steamid = '${req.session.userSteamID}'`,
        (error, results, fields) => {
          if (error) throw error;
          const avatar = results[0].avatar;
          const balance = results[0].balance;
          const authVars = {
            logo: process.env.LOGO,
            currency: process.env.CURRENCY,
            slide_1: process.env.SLIDE_1,
            slide_2: process.env.SLIDE_2,
            slide_3: process.env.SLIDE_3,
            tg_channel: process.env.TG_CHANNEL,
            discord_server_id: process.env.DISCORD_SERVER_ID,
            name: process.env.NAME,
            avatar: avatar,
            balance: balance,
            userName: userName,
            steamLink: `https://steamcommunity.com/profiles/${req.session.userSteamID}`,
          };
          res.render(
            path.join(__dirname, "views", "./user-profile.ejs"),
            authVars
          );
        }
      );
    } else {
      // Если пользователь не был аутентифицирован, перенаправляем его на страницу входа
      res.redirect("/auth/steam");
    }
  },
};
