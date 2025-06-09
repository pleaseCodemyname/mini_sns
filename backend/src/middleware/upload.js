const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config/config");

// 업로드 디렉토리가 없으면 생성
const uploadDir = config.UPLOAD_PATH;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 프로필 이미지 저장 설정
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileDir = path.join(uploadDir, "profiles");
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    // 파일명: userId_timestamp.확장자
    const userId = req.user.userId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${userId}_${timestamp}${ext}`);
  },
});

// 게시물 이미지 저장 설정
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const postDir = path.join(uploadDir, "posts");
    if (!fs.existsSync(postDir)) {
      fs.mkdirSync(postDir, { recursive: true });
    }
    cb(null, postDir);
  },
  filename: (req, file, cb) => {
    // 파일명: postId_timestamp.확장자
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const randomString = Math.random().toString(36).substring(2, 8);
    cb(null, `post_${timestamp}_${randomString}${ext}`);
  },
});

// 파일 필터 (이미지만 허용)
const fileFilter = (req, file, cb) => {
  if (config.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF만 허용)"),
      false
    );
  }
};

// 프로필 이미지 업로드 미들웨어
const uploadProfile = multer({
  storage: profileStorage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
}).single("profileImage");

// 게시물 이미지 업로드 미들웨어
const uploadPost = multer({
  storage: postStorage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 5, // 게시물당 최대 5개 이미지
  },
  fileFilter,
}).array("images", 5);

// 단일 파일 업로드 미들웨어
const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
}).single("file");

// 에러 처리 미들웨어
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "파일 크기가 너무 큽니다.",
        maxSize: `${config.MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "파일 개수가 초과되었습니다.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "예상하지 못한 파일 필드입니다.",
      });
    }
  }

  if (error.message.includes("지원하지 않는 파일 형식")) {
    return res.status(400).json({
      message: error.message,
      allowedTypes: config.ALLOWED_FILE_TYPES,
    });
  }

  next(error);
};

// 파일 삭제 유틸리티
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`파일 삭제 성공: ${filePath}`);
    }
  } catch (error) {
    console.error(`파일 삭제 실패: ${filePath}`, error);
  }
};

module.exports = {
  uploadProfile,
  uploadPost,
  uploadSingle,
  handleUploadError,
  deleteFile,
};
