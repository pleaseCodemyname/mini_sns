// 유저 DB
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../config/config");

// 스키마 생성
const userSchema = new mongoose.Schema(
  {
    // 유저 이름
    username: {
      type: String,
      required: [true, "사용자명은 필수입니다."],
      unique: true,
      trim: true,
      minlength: [3, "사용자명은 3자 이상이어야 합니다."],
      maxlength: [20, "사용자명은 20자 이하여야 합니다."],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.",
      ],
    },
    // 유저 이메일
    email: {
      type: String,
      required: [true, "이메일은 필수입니다."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "올바른 이메일 형식이 아닙니다.",
      ],
    },
    // 유저 비번
    password: {
      type: String,
      required: [true, "비밀번호는 필수입니다."],
      minlength: [6, "비밀번호는 6자 이상이어야 합니다."],
      select: false, // 기본적으로 조회시 제외
    },
    // 프로필 이미지
    profileImage: {
      type: String,
      default: null,
    },
    // 유저 자기소개
    intro: {
      type: String,
      maxlength: [200, "자기소개는 200자 이하여야 합니다."],
      default: "",
    },
    // 계정 활성화 상태
    isActive: {
      type: Boolean,
      default: true,
    },
    // 마지막 로그인 시간
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    // createdAt, updatedAt 자동 생성
    timestamps: true,
  }
);

// 비밀번호 해싱 미들웨어
userSchema.pre("save", async function (next) {
  // 비밀번호가 수정되지 않았으면 다음 단계로
  if (!this.isModified("password")) return next();

  try {
    // config에서 정의한 saltRounds 사용
    this.password = await bcrypt.hash(this.password, config.BCRYPT_SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 비교 메서드
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 마지막 로그인 시간 업데이트 메서드
userSchema.methods.updateLastLogin = async function () {
  this.lastLoginAt = new Date();
  return this.save();
};

// 사용자 통계 조회를 위한 정적 메서드
userSchema.statics.getUserStats = async function (userId) {
  const Post = require("./Post");
  const Follow = require("./Follow");

  const [postsCount, followersCount, followingCount] = await Promise.all([
    Post.countDocuments({ author: userId }),
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
  ]);

  return {
    postsCount,
    followersCount,
    followingCount,
  };
};

// 인덱스 설정
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
