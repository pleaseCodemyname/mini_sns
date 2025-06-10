const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const path = require("path");

// 설정 및 데이터베이스
const config = require("./config/config");
const connectDB = require("./config/database");

// 미들웨어
const { errorHandler, notFound } = require("./middleware/errorHandler");

// 소켓 관리자
const socketManager = require("./utils/socket");

// API 문서화
const { createMiniSNSAPIDocs } = require("./utils/apiDocs");

// 라우터 (새로운 구조)
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users"); // profile.js 대체
const postRoutes = require("./routes/posts"); // 개선됨
const interactionRoutes = require("./routes/interactions"); // 새로 생성 (likes + comments)
const socialRoutes = require("./routes/social"); // 새로 생성 (follow + notifications)
const feedRoutes = require("./routes/feed");
const searchRoutes = require("./routes/search");

const app = express();

// ==================== 보안 및 기본 미들웨어 ====================

// 보안 헤더 설정
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS 설정
const corsOptions = {
  origin: [
    config.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3001",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "Pragma",
  ],
  credentials: true,
  maxAge: 86400, // 24시간
};

app.use(cors(corsOptions));

// 압축
app.use(compression());

// 요청 크기 제한
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: config.NODE_ENV === "production" ? 100 : 1000, // 프로덕션에서 더 엄격
  message: {
    success: false,
    message: "너무 많은 요청이 감지되었습니다. 잠시 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// 로깅
if (config.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// 정적 파일 제공
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

// ==================== 헬스 체크 ====================

app.get("/health", (req, res) => {
  const healthInfo = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    database: "connected", // TODO: 실제 DB 상태 확인
    services: {
      socket:
        socketManager.getOnlineUsersCount() >= 0 ? "healthy" : "unhealthy",
    },
  };

  res.json(healthInfo);
});

// API 정보
app.get("/api", (req, res) => {
  res.json({
    name: "Mini SNS API",
    version: "1.0.0",
    description: "간단한 소셜 네트워크 서비스 API",
    documentation: "/api/docs",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      posts: "/api/posts",
      interactions: "/api/interactions",
      social: "/api/social",
      feed: "/api/feed",
      search: "/api/search",
    },
    realtime: {
      websocket: true,
      onlineUsers: socketManager.getOnlineUsersCount(),
    },
  });
});

// ==================== API 라우트 ====================

// API 라우트 등록 (새로운 구조)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); // profile → users
app.use("/api/posts", postRoutes);
app.use("/api/interactions", interactionRoutes); // 새로 생성 (likes + comments)
app.use("/api/social", socialRoutes); // 새로 생성 (follow + notifications)
app.use("/api/feed", feedRoutes);
app.use("/api/search", searchRoutes);

// ==================== API 문서화 ====================

// API 문서 엔드포인트
app.get("/api/docs", async (req, res) => {
  try {
    const docs = createMiniSNSAPIDocs();
    const format = req.query.format || "json";

    if (format === "markdown") {
      const markdown = docs.generateMarkdownDocs();
      res.set("Content-Type", "text/markdown");
      res.send(markdown);
    } else {
      res.json(docs.exportToJSON());
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "API 문서 생성 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// Postman 컬렉션 다운로드
app.get("/api/docs/postman", (req, res) => {
  try {
    const docs = createMiniSNSAPIDocs();
    const { generatePostmanCollection } = require("./utils/apiDocs");
    const collection = generatePostmanCollection(docs);

    res.set({
      "Content-Type": "application/json",
      "Content-Disposition":
        'attachment; filename="mini-sns-api.postman_collection.json"',
    });
    res.json(collection);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Postman 컬렉션 생성 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// ==================== WebSocket 설정 ====================

let server;

const startServer = async () => {
  try {
    // MongoDB 연결
    await connectDB();

    // HTTP 서버 시작
    server = app.listen(config.PORT, () => {
      console.log(`🚀 서버가 포트 ${config.PORT}에서 실행 중입니다.`);
      console.log(`📱 환경: ${config.NODE_ENV}`);
      console.log(`🌐 URL: http://localhost:${config.PORT}`);
      console.log(`📚 API 문서: http://localhost:${config.PORT}/api/docs`);
    });

    // Socket.IO 초기화
    socketManager.initialize(server, corsOptions);

    // 프로세스 종료 시 정리
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    console.error("❌ 서버 시작 실패:", error);
    process.exit(1);
  }
};

// ==================== 에러 처리 ====================

// 404 처리
app.use(notFound);

// 전역 에러 처리
app.use(errorHandler);

// Promise rejection 처리
process.on("unhandledRejection", (err) => {
  console.error("🚨 Unhandled Promise Rejection:", err);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Uncaught Exception 처리
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception:", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// ==================== 우아한 종료 ====================

const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} 신호를 받았습니다. 우아한 종료를 시작합니다...`);

  if (server) {
    server.close(() => {
      console.log("📡 HTTP 서버가 종료되었습니다.");

      // Socket.IO 정리
      socketManager.cleanup();

      // 데이터베이스 연결 종료
      const mongoose = require("mongoose");
      mongoose.connection.close(() => {
        console.log("🔌 MongoDB 연결이 종료되었습니다.");
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }

  // 강제 종료 타이머 (30초)
  setTimeout(() => {
    console.error("⏰ 강제 종료됩니다.");
    process.exit(1);
  }, 30000);
};

// ==================== 개발 환경 설정 ====================

if (config.NODE_ENV === "development") {
  // 개발 환경에서 API 문서 자동 생성
  app.get("/api/docs/generate", async (req, res) => {
    try {
      const docs = createMiniSNSAPIDocs();
      const format = req.query.format || "markdown";
      const filename = await docs.saveToFile(format);

      res.json({
        success: true,
        message: `API 문서가 생성되었습니다: ${filename}`,
        filename,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "API 문서 생성 실패",
        error: error.message,
      });
    }
  });

  // 개발용 디버깅 정보
  app.get("/debug", (req, res) => {
    res.json({
      environment: config.NODE_ENV,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      socketConnections: socketManager.getOnlineUsersCount(),
      onlineUsers: socketManager.getOnlineUsers(),
    });
  });
}

// ==================== 모듈 내보내기 ====================

// 테스트를 위해 앱 인스턴스 내보내기
module.exports = { app, server, startServer, gracefulShutdown };

// 직접 실행된 경우 서버 시작
if (require.main === module) {
  startServer();
}
