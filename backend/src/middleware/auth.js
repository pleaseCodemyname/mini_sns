// 인증 미들웨어
const User = require("../models/User");
const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");

const auth = async (req, res, next) => {
  try {
    // 헤더에서 토큰 가져오기
    const authHeader = req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        message: "로그인이 필요합니다. 토큰이 없습니다.",
      });
    }

    // 토큰 검증 (JWT 유틸리티 사용)
    const decoded = verifyToken(token);

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

    // JWT 유틸리티에서 처리된 에러 메시지 사용
    if (
      error.message.includes("토큰이 만료") ||
      error.message.includes("유효하지 않은 토큰")
    ) {
      return res.status(401).json({ message: error.message });
    }

    res.status(500).json({
      message: "서버 오류",
      error: error.message,
    });
  }
};

module.exports = auth;
