// 유저 DB
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 스키마 생성
const userSchema = new mongoose.Schema(
  {
    // 스키마에 들어갈 필드
    // 유저 이름
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    // 유저 이메일
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // 유저 비번
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // 프로필 이미지
    profileImage: {
      type: String,
      default: null,
    },
    // 유저 자기소개
    intro: {
      type: String,
      maxlength: 150,
      default: "",
    },
  },
  {
    // createdAt, updatedAt 자동 생성
    timestamps: true,
  }
);

// 비밀번호 해싱 미들웨어
/**
 - pre("save"): mongooose의 미들웨어 --> 문서 저장되기 직전 실행(사용자가 회원가입, 비번 변경시 저장하기 전 특정 작업 수행할 수 있도록)
 - if (!this.isModified("password")) return next(); --> 사용자가 비번 변경하지 않았으면 다음 단계로 넘어감
 - this.password = await bcrypt.hash(this.password, 12); --> 사용자가 직접 입력한 비번 bcrypt.has를 이용해 암호화 해싱, 12(해싱강도: saltRounds), 숫자가 클수록 보안 더 강해지지만 느려짐
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model("User", userSchema);
