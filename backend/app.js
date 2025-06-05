const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB 연결
mongoose
  .connect(process.env.MONGODB_URI)

  .then(() => console.log("MongoDB 연결 성공"))
  .catch((err) => console.log("MongoDB 연결 실패:", err));

// JSON 파싱 미들웨어
app.use(express.json());

app.get("/", (req, res) => {
  res.send("mini_sns portfolio");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
