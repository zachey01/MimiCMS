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
const http = require("http").createServer(app);
const io = require("socket.io")(http);

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
          steamLink: `https://steamcommunity.com/id/${userSteamID}`,
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

const messages = [];
app.use(express.json());
io.on("connection", (socket) => {
  console.log("Пользователь подключился");

  socket.on("chat message", (msg) => {
    console.log(`Сообщение: ${msg}`);
    messages.push(msg);
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Пользователь отключился");
  });
});
app.get("/chat", (req, res) => {
  pool.query(
    "SELECT messages.message, users.name FROM messages JOIN users ON messages.author = users.steamid ORDER BY messages.created_at ASC",
    (error, results) => {
      if (error) {
        console.error("Ошибка чтения сообщений из базы данных:", error);
        res.render(path.join(__dirname, "views", "./chat.ejs"), {
          messages: [],
        });
      } else {
        const messages = results.map((result) => {
          return { message: result.message, author: result.name };
        });
        res.render(path.join(__dirname, "views", "./chat.ejs"), {
          messages: messages,
        });
      }
    }
  );
});
app.post("/message", (req, res) => {
  const message = req.body.message;
  console.log(`Сообщение: ${message}`);
  const author = userSteamID;
  const newMessage = { message: message, author: author }; // Создаем новый объект сообщения
  messages.push(newMessage); // Добавляем объект сообщения в массив сообщений
  io.emit("chat message", newMessage); // Отправляем сообщение
  pool.query(
    "INSERT INTO messages (message, author) VALUES (?, ?)",
    [message, author],
    (error, result) => {
      if (error) {
        console.error("Ошибка сохранения сообщения в базу данных:", error);
      } else {
        console.log("Сообщение успешно сохранено в базе данных");
      }
    }
  );
  res.sendStatus(200);
});
app.get("/messages", (req, res) => {
  pool.query(
    "SELECT messages, created_at FROM messages ORDER BY created_at DESC",
    (error, results) => {
      if (error) {
        console.error("Ошибка чтения сообщений из базы данных:", error);
        res.sendStatus(500);
      } else {
        const messages = results.map((result) => {
          return {
            message: result.message,
            created_at: result.created_at,
          };
        });
        res.send(messages);
      }
    }
  );
});
app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
