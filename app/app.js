let express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  path = require("path"),
  ejs = require("ejs");
require("dotenv").config();

let userSteamID;
let userAvatar;
let userName;

app.set("view engine", "ejs");
app.use(express.static("./public/public"));
app.use(
  session({
    secret: "test secret",
    resave: false,
    saveUninitialized: false,
  })
);
const port = process.env.PORT || 3000;
const pool = mysql.createPool({
  poolLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.getConnection((err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных: " + err.stack);
    return;
  }
  console.log("Подключение к базе данных успешно установлено");
});

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
            "REPLACE INTO users SET ?",
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
                "Данные о пользователе успешно записаны в базу данных"
              );
              // Сохраняем steam id пользователя
              userSteamID = profile.id;
              userName = profile.displayName;
              return done(null, profile);
            }
          );
        },
      });
    }
  )
);
const vars = {
  logo: process.env.LOGO,
  currency: process.env.CURRENCY,
  slide_1: process.env.SLIDE_1,
  slide_2: process.env.SLIDE_2,
  slide_3: process.env.SLIDE_3,
  tg_channel: process.env.TG_CHANNEL,
  discord_server_id: process.env.DISCORD_SERVER_ID,
  name: process.env.NAME,
};
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((steamid, done) => {
  connection.query(
    "SELECT * FROM users WHERE steamid = ?",
    [profile.id],
    (err, results) => {
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
    }
  );
});

app.get(
  "/auth/steam",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  (req, res) => {
    // Пользователь уже авторизован, перенаправляем на страницу профиля
    if (req.isAuthenticated()) {
      return res.redirect("/");
    }
    res.redirect("/");
  }
);

app.get("/logout", (req, res) => {
  userSteamID = null; // Сбрасываем steam id пользователя
  res.redirect("/"); // Перенаправляем на главную страницу
});

app.get(
  "/auth/steam/return",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  (req, res) => {
    // Пользователь уже авторизован, перенаправляем на страницу профиля
    if (req.isAuthenticated()) {
      return res.redirect("/");
    }
    res.redirect("/");
  }
);

app.get("/profile", (req, res) => {
  if (userSteamID) {
    res.send(`Steam ID пользователя: ${userSteamID}`);
  } else {
    res.send("Вы не авторизован");
  }
});

app.get("/", function (req, res) {
  let avatar = "";
  if (userSteamID) {
    pool.query(
      `SELECT avatar, balance FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) throw error;
        avatar = results[0].avatar;
        balance = results[0].balance;
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
        };
        res.render(path.join(__dirname, "views", "./index.ejs"), authVars);
      }
    );
  } else {
    res.render(path.join(__dirname, "views", "./nonAuthIndex.ejs"), vars);
  }
});
app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
