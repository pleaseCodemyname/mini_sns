// 인증 미들웨어
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, resizeBy, next) => {
  try {
    // 헤더에서 토큰 가져오기
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        message: "로그인이 필요합니다. 토큰이 없습니다.",
      });
    }

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 사용자 찾기
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "유효하지 않은 토큰입니다.",
      });
    }

    // req에 사용자 정보 추가
    req.user = { userId: user._id, username: user.username, email: user.email };
    next();
  } catch (error) {
    console.error("인증 오류:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "토큰이 만료되었습니다." });
    }

    res.status(500).json({
      message: "서버 오류",
      error: error.message,
    });
  }
};

module.exports = auth;
