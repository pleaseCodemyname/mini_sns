const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

// 라우트 import
const authRoutes = require("./src/routes/auth");

const app = express();
const port = process.env.PORT || 3000;

// MongoDB 연결
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB 연결 성공"))
  .catch((err) => console.log("MongoDB 연결 실패:", err));

/* JSON 파싱 미들웨어
 *클라이언트가 JSON 데이터를 보내면, 이를 서버에서 해석할 수 있도록하는 역할
 * ex) 화원가입 요청 {username, email, password} 같은 JSON  데이터를 받으면 자동으로 변환됨
 */
app.use(express.json());

app.get("/", (req, res) => {
  res.send("mini_sns portfolio");
});

// API 라우트 연결
app.use("/api/auth", authRoutes); // 클라이언트가 /api/auth/register이나 /api/auth/login으로 요청을 보내면 해당 라우트 실행됨

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
