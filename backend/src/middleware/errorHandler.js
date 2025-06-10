const config = require("../config/config");

/**
 * 개발 환경용 에러 응답
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code,
      statusCode: err.statusCode,
    },
    originalError: err,
  });
};

/**
 * 프로덕션 환경용 에러 응답
 */
const sendErrorProd = (err, res) => {
  // 운영 에러 (클라이언트에게 안전하게 보여줄 수 있는 에러)
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  } else {
    // 프로그래밍 에러 등 (세부사항을 클라이언트에게 노출하지 않음)
    console.error("🚨 Programming Error:", err);

    res.status(500).json({
      success: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  }
};

/**
 * Mongoose CastError 처리
 */
const handleCastErrorDB = (err) => {
  const message = `잘못된 ${err.path}: ${err.value}`;
  return createOperationalError(message, 400);
};

/**
 * Mongoose 중복 키 에러 처리
 */
const handleDuplicateFieldsDB = (err) => {
  let message = "중복된 데이터입니다.";

  if (err.keyPattern) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue ? err.keyValue[field] : "";

    switch (field) {
      case "email":
        message = `이메일 '${value}'은(는) 이미 사용 중입니다.`;
        break;
      case "username":
        message = `사용자명 '${value}'은(는) 이미 사용 중입니다.`;
        break;
      default:
        message = `${field} '${value}'은(는) 이미 존재합니다.`;
    }
  }

  return createOperationalError(message, 400);
};

/**
 * Mongoose 검증 에러 처리
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `입력값 검증 실패: ${errors.join(". ")}`;

  return createOperationalError(message, 400);
};

/**
 * JWT 에러 처리
 */
const handleJWTError = () =>
  createOperationalError("유효하지 않은 토큰입니다. 다시 로그인해주세요.", 401);

const handleJWTExpiredError = () =>
  createOperationalError("토큰이 만료되었습니다. 다시 로그인해주세요.", 401);

/**
 * Multer 에러 처리
 */
const handleMulterError = (err) => {
  let message = "파일 업로드 중 오류가 발생했습니다.";

  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      message = `파일 크기가 너무 큽니다. 최대 ${
        config.MAX_FILE_SIZE / 1024 / 1024
      }MB까지 업로드 가능합니다.`;
      break;
    case "LIMIT_FILE_COUNT":
      message = "업로드 파일 개수가 초과되었습니다.";
      break;
    case "LIMIT_UNEXPECTED_FILE":
      message = "예상하지 못한 파일 필드입니다.";
      break;
    case "INVALID_FILE_TYPE":
      message = `지원하지 않는 파일 형식입니다. 허용된 형식: ${config.ALLOWED_FILE_TYPES.join(
        ", "
      )}`;
      break;
  }

  return createOperationalError(message, 400);
};

/**
 * MongoDB 연결 에러 처리
 */
const handleMongoNetworkError = () =>
  createOperationalError(
    "데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
    500
  );

/**
 * 운영 에러 객체 생성
 */
const createOperationalError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

/**
 * 에러 로깅
 */
const logError = (err, req) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req?.method,
    url: req?.originalUrl,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    userId: req?.user?.userId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
    },
  };

  if (err.statusCode >= 500) {
    console.error("🚨 Server Error:", JSON.stringify(errorInfo, null, 2));
  } else if (config.NODE_ENV === "development") {
    console.warn("⚠️ Client Error:", JSON.stringify(errorInfo, null, 2));
  }
};

/**
 * 전역 에러 처리 미들웨어
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // 에러 로깅
  logError(err, req);

  // 특정 에러 타입별 처리
  if (err.name === "CastError") error = handleCastErrorDB(error);
  if (err.code === 11000) error = handleDuplicateFieldsDB(error);
  if (err.name === "ValidationError") error = handleValidationErrorDB(error);
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
  if (
    err.name === "MulterError" ||
    err.code?.includes("LIMIT_") ||
    err.code === "INVALID_FILE_TYPE"
  ) {
    error = handleMulterError(error);
  }
  if (err.name === "MongoNetworkError") error = handleMongoNetworkError();

  // 환경별 에러 응답
  if (config.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * 404 에러 처리 미들웨어
 */
const notFound = (req, res, next) => {
  const message = `요청한 경로 ${req.originalUrl}을 찾을 수 없습니다.`;
  const error = createOperationalError(message, 404);
  next(error);
};

/**
 * 비동기 에러 처리를 위한 래퍼 함수
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 사용자 정의 에러 클래스
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 에러 응답 헬퍼 함수들
 */
const sendBadRequest = (res, message = "잘못된 요청입니다.") => {
  res.status(400).json({ success: false, message });
};

const sendUnauthorized = (res, message = "인증이 필요합니다.") => {
  res.status(401).json({ success: false, message });
};

const sendForbidden = (res, message = "접근 권한이 없습니다.") => {
  res.status(403).json({ success: false, message });
};

const sendNotFound = (res, message = "요청한 리소스를 찾을 수 없습니다.") => {
  res.status(404).json({ success: false, message });
};

const sendConflict = (res, message = "리소스 충돌이 발생했습니다.") => {
  res.status(409).json({ success: false, message });
};

const sendServerError = (res, message = "서버 내부 오류가 발생했습니다.") => {
  res.status(500).json({ success: false, message });
};

const sendSuccess = (
  res,
  data = null,
  message = "요청이 성공적으로 처리되었습니다."
) => {
  const response = { success: true, message };
  if (data) response.data = data;
  res.status(200).json(response);
};

const sendCreated = (
  res,
  data = null,
  message = "리소스가 성공적으로 생성되었습니다."
) => {
  const response = { success: true, message };
  if (data) response.data = data;
  res.status(201).json(response);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  createOperationalError,

  // 에러 응답 헬퍼
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendServerError,

  // 성공 응답 헬퍼
  sendSuccess,
  sendCreated,

  // 개별 에러 핸들러 (테스트용)
  handleCastErrorDB,
  handleDuplicateFieldsDB,
  handleValidationErrorDB,
  handleJWTError,
  handleJWTExpiredError,
  handleMulterError,
  handleMongoNetworkError,
};
