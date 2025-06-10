require("dotenv").config();

module.exports = {
  // JWT 설정
  JWT_SECRET: process.env.JWT_SECRET || "mini_sns_secret_key_2025",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // 서버 설정
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // 데이터베이스 설정
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/mini_sns",

  // 파일 업로드 설정
  UPLOAD_PATH: process.env.UPLOAD_PATH || "./uploads",
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/gif"],

  // 페이지네이션 기본값
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // 보안 설정
  BCRYPT_SALT_ROUNDS: 12,

  // 클라이언트 URL (CORS용)
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3001",

  // 이메일 설정 (나중에 사용할 수 있음)
  EMAIL_SERVICE: process.env.EMAIL_SERVICE,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
};
