const express = require("express");
const app = express();
const port = 80;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./pages/main.html"));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
