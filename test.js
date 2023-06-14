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

app.get("/pay", function (req, res) {
  let avatar = "";
  if (userSteamID) {
    pool.query(
      `SELECT avatar, balance FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) throw error;
        avatar = results[0].avatar;
        balance = results[0].balance;
        return (authVars = {
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
        });
      }
    );
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
        authVars,
      };

      res.render(path.join(__dirname, "views", "./pay.ejs"), shopVars);
    });
  } else {
    res.render(path.join(__dirname, "views", "./nonAuthErr.ejs"), vars);
  }
});

app.get("/shop", function (req, res) {
  let avatar = "";
  if (userSteamID) {
    pool.query(
      `SELECT avatar, balance FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) throw error;
        avatar = results[0].avatar;
        balance = results[0].balance;
        return (authVars = {
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
        });
      }
    );
  } else {
    res.render(path.join(__dirname, "views", "./nonAuthErr.ejs"), vars);
  }
});

app.get("/test123", function (req, res) {
  res.render(path.join(__dirname, "views", "./shop.ejs"), authVars);
});

app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
