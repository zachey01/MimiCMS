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
// Routes
require("dotenv").config();
const {
  Server,
  RCON,
  MasterServer,
} = require("@fabricio-191/valve-server-query");

let userSteamID;
let userAvatar;
let userName;
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
const port = process.env.PORT || 3000;
const pool = require("./config/db");

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

// io.on("connection", (socket) => {
//   console.log("Пользователь подключился");

//   socket.on("chat message", (msg) => {
//     console.log(`Сообщение: ${msg}`);
//     messages.push(msg);
//     io.emit("chat message", msg);
//   });

//   socket.on("disconnect", () => {
//     console.log("Пользователь отключился");
//   });
// });

// app.get("/chat", (req, res) => {
//   pool.query(
//     "SELECT messages.message, users.name FROM messages JOIN users ON messages.author = users.steamid ORDER BY messages.created_at ASC",
//     (error, results) => {
//       if (error) {
//         console.error("Ошибка чтения сообщений из базы данных:", error);
//         res.render(path.join(__dirname, "views", "./chat.ejs"), {
//           messages: [],
//         });
//       } else {
//         const messages = results.map((result) => {
//           return { message: result.message, author: result.name };
//         });
//         res.render(path.join(__dirname, "views", "./chat.ejs"), {
//           messages: messages,
//         });
//       }
//     }
//   );
// });

// app.post("/message", (req, res) => {
//   const message = req.body.message.trim(); // Удаляем пробелы в начале и конце сообщения
//   if (!message) {
//     // Если сообщение пустое, возвращаем ошибку
//     return res.status(400).send("Сообщение не может быть пустым");
//   }

//   console.log(`Сообщение: ${message}`);
//   const author = userSteamID;
//   const newMessage = { message: message, author: author }; // Создаем новый объект сообщения
//   messages.push(newMessage); // Добавляем объект сообщения в массив сообщений
//   io.emit("chat message", newMessage); // Отправляем сообщение
//   pool.query(
//     "INSERT INTO messages (message, author) VALUES (?, ?)",
//     [message, author],
//     (error, result) => {
//       if (error) {
//         console.error("Ошибка сохранения сообщения в базу данных:", error);
//       } else {
//         console.log("Сообщение успешно сохранено в базе данных");
//       }
//     }
//   );
//   res.sendStatus(200);
// });
// app.get("/messages", (req, res) => {
//   pool.query(
//     "SELECT messages, created_at FROM messages ORDER BY created_at DESC",
//     (error, results) => {
//       if (error) {
//         console.error("Ошибка чтения сообщений из базы данных:", error);
//         res.sendStatus(500);
//       } else {
//         const messages = results.map((result) => {
//           return {
//             message: result.message,
//             created_at: result.created_at,
//           };
//         });
//         res.send(messages);
//       }
//     }
//   );
// });

// // Отображение списка тем
// app.get("/topics", function (req, res) {
//   pool.query("SELECT * FROM topics", function (err, results) {
//     if (err) throw err;
//     res.render(path.join(__dirname, "views", "./topics.ejs"), {
//       topics: results,
//     });
//   });
// });

// // Создание новой темы
// app.get("/topics/new", function (req, res) {
//   res.render(path.join(__dirname, "views", "./new_topic.ejs"));
// });

// app.post("/topics", function (req, res) {
//   const { title, content } = req.body;
//   const author = userSteamID;
//   pool.query(
//     "INSERT INTO topics (title, content, author) VALUES (?, ?, ?)",
//     [title, content, author],
//     function (err, result) {
//       if (err) throw err;
//       res.redirect("/topics");
//     }
//   );
// });

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

app.get("/test", function (req, res) {
  res.render(path.join(__dirname, "views", "./404.ejs"), vars);
});

// // Отображение комментариев к теме
// app.get("/topics/:id", function (req, res) {
//   const topicId = req.params.id;
//   pool.query(
//     "SELECT * FROM topics WHERE id = ?",
//     [topicId],
//     function (err, topicResults) {
//       if (err) throw err;
//       pool.query(
//         "SELECT * FROM comments WHERE topic_id = ?",
//         [topicId],
//         function (err, commentResults) {
//           if (err) throw err;
//           res.render("topic", {
//             topic: topicResults[0],
//             comments: commentResults,
//           });
//         }
//       );
//     }
//   );
// });

// // Создание нового комментария
// app.post("/topics/:id/comments", function (req, res) {
//   const topicId = req.params.id;
//   const { content } = req.body;
//   const author = userSteamID;
//   pool.query(
//     "INSERT INTO comments (topic_id, content, author) VALUES (?, ?, ?)",
//     [topicId, content, author],
//     function (err, result) {
//       if (err) throw err;
//       res.redirect(`/topics/${topicId}`);
//     }
//   );
// });

// // Изменение рейтинга комментария
// app.post("/comments/:id/rating", function (req, res) {
//   const commentId = req.params.id;
//   const { rating } = req.body;
//   pool.query(
//     "UPDATE comments SET rating = ? WHERE id = ?",
//     [rating, commentId],
//     function (err, result) {
//       if (err) throw err;
//       res.sendStatus(200);
//     }
//   );
// });

app.get("/shop", function (req, res) {
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
        res.render(path.join(__dirname, "views", "./shop.ejs"), authVars);
      }
    );
  } else {
    res.render(path.join(__dirname, "views", "./nonAuthShop.ejs"), vars);
  }
});

app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
