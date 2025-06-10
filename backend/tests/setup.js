const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongoServer;

// 테스트 시작 전 설정
beforeAll(async () => {
  // 메모리 MongoDB 서버 시작
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // 기존 연결이 있다면 종료
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // 테스트 DB 연결
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("🧪 테스트 데이터베이스 연결 완료");
});

// 각 테스트 후 데이터 정리
afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// 모든 테스트 완료 후 정리
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }

  console.log("🧪 테스트 데이터베이스 연결 종료");
});

// 테스트 타임아웃 설정 (30초)
jest.setTimeout(30000);

// 환경변수 설정
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.UPLOAD_PATH = "./tests/uploads";
process.env.MAX_FILE_SIZE = "5242880";

// 콘솔 로그 억제 (선택사항)
if (process.env.SUPPRESS_TEST_LOGS === "true") {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}
