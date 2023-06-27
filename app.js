/*!
 * MimiCMS v1.0 (https://github.com/zachey01/MimiCMS)
 */

const { getgroups } = require("process");

let // Modules
  express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  moment = require("moment"),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query"),
  winston = require("winston"),
  expressWinston = require("express-winston"),
  compress = require("compression"),
  // Routes
  mainRoutes = require("./routes/route"),
  // Middlewares
  friendList = require("./middlewares/friendList"),
  getBonus = require("./middlewares/getBonus"),
  // Config
  pool = require("./config/db"),
  port = process.env.PORT || 80;

require("dotenv").config();

// Получение списка друзей
// TODO: добавить их в профиль и отображать тех, кто есть в бд
/*
async function getFriendList() {
  const friends = await friendList(userSteamID); // вызываем функцию и ждем завершения
  return await friends;
}

getFriendList()
  .then((friends) => {
    console.log(friends);
  })
  .catch((error) => {
    console.error(error.response.data);
  });
*/

// Получение списка подписок пользователя
// TODO: сделать старницу задания для получения бонусов за подписку игру и т.д.
/*
async function getGroupList() {
  const groups = await getBonus(userSteamID); // вызываем функцию и ждем завершения
  return await groups;
}

 getGroupList().then((groups) => {
  console.log(groups);
});
*/

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

// ExpressJS configuration
app.use(compress());
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

// Request logging
app.use(
  expressWinston.logger({
    winstonInstance: logger,
    level: "info",
    meta: false,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) {
      return false;
    },
  })
);

// Routes
app.use("/", mainRoutes);

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
            logger.error(`Failed to retrieve user data: ` + err.stack);
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
                logger.error(
                  `Error writing data about the user to the database: ` +
                    err.stack
                );
                return done(err);
              }
              logger.info(
                "Data about " +
                  profile.displayName +
                  " successfully written to the database"
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
      console.error("User search error in the database: " + err.stack);
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

// Error logging
app.use(
  expressWinston.errorLogger({
    winstonInstance: logger,
  })
);

app.get(
  "*",

  (req, res) => {
    res.render;
  }
);

// Start the server
app.listen(port, () => console.log("Server started on port " + port));
