/*!
 * MimiCMS v1.0 (https://github.com/zachey01/MimiCMS)
 */
let // Modules
  express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query"),
  // Routes
  mainRoutes = require("./routes/main"),
  wikiRoutes = require("./routes/wiki"),
  forumRoutes = require("./routes/forum"),
  // Config
  pool = require("./config/db"),
  port = process.env.PORT || 80;
require("dotenv").config();

// ExpressJS configuration
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

let userSteamID, userAvatar, userName;

passport.use(
  new SteamStrategy(
    {
      returnURL: `http://${
        process.env.DOMAIN || "localhost"
      }:${port}/auth/steam/return`,
      realm: `http://${process.env.DOMAIN || "localhost"}:${port}/`,
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
  req.session.steamid = null;
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

app.use("/", mainRoutes);
// app.use("/wiki", wikiRoutes);
// app.use("/forum", forumRoutes);

app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
