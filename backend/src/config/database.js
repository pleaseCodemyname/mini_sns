const mongoose = require("mongoose");
const config = require("./config");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      // MongoDB 연결 옵션
    });

    console.log(`✅ MongoDB 연결 성공: ${conn.connection.host}`);

    // 연결 이벤트 리스너
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB 연결 오류:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📡 MongoDB 연결이 끊어졌습니다.");
    });

    // 앱 종료 시 연결 정리
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("🔌 MongoDB 연결이 정상적으로 종료되었습니다.");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ MongoDB 연결 실패:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
