const jwt = require("jsonwebtoken");
const config = require("../config/config");

/**
 * JWT 토큰 생성
 * @param {Object} payload - 토큰에 포함할 데이터
 * @param {String} expiresIn - 만료 시간 (옵션)
 * @returns {String} JWT 토큰
 */
const generateToken = (payload, expiresIn = config.JWT_EXPIRES_IN) => {
  try {
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
  } catch (error) {
    throw new Error("토큰 생성 실패: " + error.message);
  }
};

/**
 * JWT 토큰 검증
 * @param {String} token - 검증할 토큰
 * @returns {Object} 디코딩된 페이로드
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("토큰이 만료되었습니다");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("유효하지 않은 토큰입니다");
    } else {
      throw new Error("토큰 검증 실패: " + error.message);
    }
  }
};

/**
 * 리프레시 토큰 생성 (장기간 유효)
 * @param {Object} payload - 토큰에 포함할 데이터
 * @returns {String} 리프레시 토큰
 */
const generateRefreshToken = (payload) => {
  return generateToken(payload, "30d"); // 30일 유효
};

/**
 * Authorization 헤더에서 토큰 추출
 * @param {String} authHeader - Authorization 헤더 값
 * @returns {String|null} 추출된 토큰 또는 null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
};

/**
 * 토큰 디코딩 (검증 없이)
 * @param {String} token - 디코딩할 토큰
 * @returns {Object} 디코딩된 데이터
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error("토큰 디코딩 실패: " + error.message);
  }
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  extractTokenFromHeader,
  decodeToken,
};
