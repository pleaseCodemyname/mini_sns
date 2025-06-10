const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config/config");

/**
 * 업로드 디렉토리 생성 함수
 * @param {string} dir - 생성할 디렉토리 경로
 */
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * 파일명 생성 함수
 * @param {string} prefix - 파일명 접두사
 * @param {string} originalname - 원본 파일명
 * @param {string} userId - 사용자 ID (옵션)
 * @returns {string} 생성된 파일명
 */
const generateFileName = (prefix, originalname, userId = null) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalname);

  if (userId) {
    return `${prefix}_${userId}_${timestamp}_${randomString}${ext}`;
  }
  return `${prefix}_${timestamp}_${randomString}${ext}`;
};

/**
 * 파일 타입 검증 함수
 * @param {Object} file - multer 파일 객체
 * @returns {boolean} 허용된 파일 타입인지 여부
 */
const isValidFileType = (file) => {
  return config.ALLOWED_FILE_TYPES.includes(file.mimetype);
};

/**
 * 프로필 이미지 저장소 설정
 */
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileDir = path.join(config.UPLOAD_PATH, "profiles");
    ensureDirectoryExists(profileDir);
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.userId || "anonymous";
    const filename = generateFileName("profile", file.originalname, userId);
    cb(null, filename);
  },
});

/**
 * 게시물 이미지 저장소 설정
 */
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const postDir = path.join(config.UPLOAD_PATH, "posts");
    ensureDirectoryExists(postDir);
    cb(null, postDir);
  },
  filename: (req, file, cb) => {
    const filename = generateFileName("post", file.originalname);
    cb(null, filename);
  },
});

/**
 * 메모리 저장소 (임시 처리용)
 */
const memoryStorage = multer.memoryStorage();

/**
 * 파일 필터
 */
const fileFilter = (req, file, cb) => {
  if (isValidFileType(file)) {
    cb(null, true);
  } else {
    const error = new Error(
      `지원하지 않는 파일 형식입니다. 허용된 형식: ${config.ALLOWED_FILE_TYPES.join(
        ", "
      )}`
    );
    error.code = "INVALID_FILE_TYPE";
    cb(error, false);
  }
};

/**
 * 공통 multer 옵션
 */
const commonOptions = {
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter,
};

/**
 * 프로필 이미지 업로드 미들웨어
 */
const uploadProfile = multer({
  storage: profileStorage,
  ...commonOptions,
  limits: {
    ...commonOptions.limits,
    files: 1, // 프로필 이미지는 1개만
  },
}).single("profileImage");

/**
 * 게시물 이미지 업로드 미들웨어 (다중 파일)
 */
const uploadPostImages = multer({
  storage: postStorage,
  ...commonOptions,
  limits: {
    ...commonOptions.limits,
    files: 5, // 게시물당 최대 5개 이미지
  },
}).array("images", 5);

/**
 * 단일 파일 업로드 미들웨어 (메모리)
 */
const uploadSingle = multer({
  storage: memoryStorage,
  ...commonOptions,
  limits: {
    ...commonOptions.limits,
    files: 1,
  },
}).single("file");

/**
 * 다중 파일 업로드 미들웨어 (메모리)
 */
const uploadMultiple = multer({
  storage: memoryStorage,
  ...commonOptions,
  limits: {
    ...commonOptions.limits,
    files: 10,
  },
}).array("files", 10);

/**
 * 파일 삭제 유틸리티
 * @param {string} filePath - 삭제할 파일 경로
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log(`파일 삭제 성공: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`파일 삭제 실패: ${filePath}`, error);
    return false;
  }
};

/**
 * 디렉토리 내 파일들 삭제
 * @param {string} dirPath - 디렉토리 경로
 * @param {RegExp} pattern - 파일명 패턴 (옵션)
 * @returns {Promise<number>} 삭제된 파일 수
 */
const cleanupDirectory = async (dirPath, pattern = null) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const files = await fs.promises.readdir(dirPath);
    let deletedCount = 0;

    for (const file of files) {
      if (pattern && !pattern.test(file)) {
        continue;
      }

      const filePath = path.join(dirPath, file);
      if (await deleteFile(filePath)) {
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error(`디렉토리 정리 실패: ${dirPath}`, error);
    return 0;
  }
};

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 * @param {number} bytes - 바이트 수
 * @returns {string} 변환된 크기 문자열
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * multer 에러 처리 미들웨어
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          message: "파일 크기가 너무 큽니다.",
          maxSize: formatFileSize(config.MAX_FILE_SIZE),
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          message: "파일 개수가 초과되었습니다.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          message: "예상하지 못한 파일 필드입니다.",
        });
      default:
        return res.status(400).json({
          message: "파일 업로드 오류가 발생했습니다.",
          error: error.message,
        });
    }
  }

  if (error.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      message: error.message,
      allowedTypes: config.ALLOWED_FILE_TYPES,
    });
  }

  next(error);
};

module.exports = {
  // 업로드 미들웨어
  uploadProfile,
  uploadPostImages,
  uploadSingle,
  uploadMultiple,

  // 에러 처리
  handleMulterError,

  // 유틸리티 함수
  deleteFile,
  cleanupDirectory,
  formatFileSize,
  ensureDirectoryExists,
  generateFileName,
  isValidFileType,

  // 저장소 설정 (고급 사용자용)
  profileStorage,
  postStorage,
  memoryStorage,
};
