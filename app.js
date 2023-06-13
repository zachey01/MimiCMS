//TODO: сделать страниу /balance и добавить оплату на киви через генерацию url для succesUrl qiwi
//TODO: реализовать списание с баланса с помощью debit
let express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query");
require("dotenv").config();

let userSteamID, userAvatar, userName;

app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("./public"));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
let port = process.env.PORT || 3000,
  pool = require("./config/db");

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

app.get(
  "/auth/steam",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  }
);

app.get("/logout", (req, res) => {
  userSteamID = null; // Сбрасываем steam id пользователя
  req.logout(); // Очищаем данные пользователя из сессии
  res.redirect("/"); // Перенаправляем на главную страницу
});

app.get(
  "/auth/steam/return",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.isAuthenticated()) {
      req.session.steamid = userSteamID;
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  }
);
let authVars = {
  logo: process.env.LOGO,
  currency: process.env.CURRENCY,
  slide_1: process.env.SLIDE_1,
  slide_2: process.env.SLIDE_2,
  slide_3: process.env.SLIDE_3,
  tg_channel: process.env.TG_CHANNEL,
  discord_server_id: process.env.DISCORD_SERVER_ID,
  name: process.env.NAME,
  avatar: "",
  balance: "",
  userName: "",
  steamLink: "",
};

app.get("/profile", function (req, res) {
  if (userSteamID) {
    pool.query(
      `SELECT avatar, balance FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) throw error;
        const avatar = results[0].avatar;
        const balance = results[0].balance;
        authVars.avatar = avatar;
        authVars.balance = balance;
        authVars.userName = userName;
        authVars.steamLink = `https://steamcommunity.com/profiles/${userSteamID}`;
        res.render(
          path.join(__dirname, "views", "./user-profile.ejs"),
          authVars
        );
      }
    );
  } else {
    res.send("Вы не авторизованы");
  }
});

var wiki = require("./routes/route");
// ...
app.use("/", wiki);

app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
