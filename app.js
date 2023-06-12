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
// const messages = [];

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
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  }
);

app.get("/profile", function (req, res) {
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
          userName: userName,
          steamLink: `https://steamcommunity.com/profiles/${userSteamID}`,
        };
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

app.get("/", async function (req, res) {
  let avatar = "";
  if (userSteamID) {
    pool.query(
      `SELECT avatar, balance FROM users WHERE steamid = '${userSteamID}'`,
      async (error, results, fields) => {
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
        if (avatar) {
          authVars.avatar = avatar;
        }

        try {
          const server = await Server({
            ip: "144.76.119.139",
            port: 27015,
            timeout: 5000,
          });
          const info = await server.getInfo();
          let data = await server.getPlayers();
          const serverVars = {
            ping: server.lastPing,
            players: await server.getPlayers(),
            numPlayersOnline: await info.players.online,
            numPlayers: await info.players.max,
            map: info.map,
            serverName: info.name,
            serverDescription: process.env.SERVER_DESCRIPTION,
          };
          res.render(
            path.join(__dirname, "views", "./index.ejs"),
            Object.assign({}, authVars, serverVars)
          );
        } catch (error) {
          console.error(error);
          res.render(path.join(__dirname, "views", "./index.ejs"), authVars);
        }
      }
    );
  } else {
    try {
      const server = await Server({
        ip: "144.76.119.139",
        port: 27015,
        timeout: 5000,
      });
      const info = await server.getInfo();
      let data = await server.getPlayers();
      const serverVars = {
        ping: server.lastPing,
        players: await server.getPlayers(),
        numPlayersOnline: await info.players.online,
        numPlayers: await info.players.max,
        map: info.map,
        serverName: info.name,
        serverDescription: process.env.SERVER_DESCRIPTION,
      };
      res.render(
        path.join(__dirname, "views", "./nonAuthIndex.ejs"),
        Object.assign({}, vars, serverVars)
      );
    } catch (error) {
      console.error(error);
      res.render(path.join(__dirname, "views", "./nonAuthIndex.ejs"), vars);
    }
  }
});

app.get("/tickets", function (req, res) {
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
          steamid: userSteamID,
          userName: userName,
          tg_token: process.env.TG_BOT_TOKEN,
          tg_group: process.env.TG_GROUP_ID,
        };
        if (avatar) {
          authVars.avatar = avatar;
        }
        res.render(path.join(__dirname, "views", "./tickets.ejs"), authVars);
      }
    );
  } else {
    res.render(path.join(__dirname, "views", "./nonAuthErr.ejs"), vars);
  }
});

app.get("/test6", function (req, res) {
  res.render(path.join(__dirname, "views", "./404.ejs"), vars);
});

// Запрос на списание со счета пользователя

app.get("/rules", function (req, res) {
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
          steamid: userSteamID,
          userName: userName,
          tg_token: process.env.TG_BOT_TOKEN,
          tg_group: process.env.TG_GROUP_ID,
        };
        if (avatar) {
          authVars.avatar = avatar;
        }
        res.render(path.join(__dirname, "views", "./rules.ejs"), authVars);
      }
    );
  } else {
    res.render(path.join(__dirname, "views", "./nonAuthErr.ejs"), vars);
  }
});

app.get("/pay", (req, res) => {
  pool.query(
    `SELECT balance FROM users WHERE steamid = ${userSteamID}`,
    (err, result) => {
      if (err) throw err;
      const balance = result[0].balance;
      res.render("pay.ejs", { balance });
    }
  );
});

app.post("/debit", (req, res) => {
  pool.query(
    `SELECT balance FROM users WHERE steamid = ${userSteamID}`,
    (err, result) => {
      if (err) throw err;
      const balance = result[0].balance;
      if (balance < 10) {
        console.log("Нету");
        return;
      }
      pool.query(
        `UPDATE users SET balance = balance - 10  WHERE steamid = ${userSteamID}`,
        (err, result) => {
          if (err) throw err;
          res.send("Success");
        }
      );
    }
  );
});

app.get("/shop", function (req, res) {
  let avatar = "";
  if (userSteamID) {
    let avatar = "";
    let userName = "";
    let balance = "";
    let userSteamID = "";
    if (req.user) {
      avatar = req.user.avatar;
      userName = req.user.username;
      balance = req.user.balance;
      userSteamID = req.user.steamid;
    }

    pool.query("SELECT * FROM products", (error, results) => {
      if (error) throw error;
      const shopVars = {
        logo: process.env.LOGO,
        currency: process.env.CURRENCY,
        slide_1: process.env.SLIDE_1,
        slide_2: process.env.SLIDE_2,
        slide_3: process.env.SLIDE_3,
        tg_channel: process.env.TG_CHANNEL,
        discord_server_id: process.env.DISCORD_SERVER_ID,
        name: process.env.NAME,
        products: results,
        avatar: avatar,
        balance: balance,
        userName: userName,
        steamLink: userSteamID
          ? `https://steamcommunity.com/profiles/${userSteamID}`
          : "",
      };
      res.render(path.join(__dirname, "views", "./products.ejs"), shopVars);
    });
  } else {
    res.render(path.join(__dirname, "views", "./nonAuthErr.ejs"), vars);
  }
});

app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
