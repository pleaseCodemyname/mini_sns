const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");

// 회원가입
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 기본 검증
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "모든 필드를 입력해주세요.",
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "올바른 이메일 형식을 입력해주세요.",
      });
    }

    // 사용자명 검증 (영문, 숫자, 언더스코어만)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: "사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.",
      });
    }

    // 사용자명 길이 검증
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: "사용자명은 3자 이상 20자 이하여야 합니다.",
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "비밀번호는 6자 이상이어야 합니다.",
      });
    }

    // 사용자 존재 여부 확인
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "이미 존재하는 사용자명 또는 이메일입니다.",
      });
    }

    // 새 사용자 생성
    const user = new User({ username, email, password });
    await user.save();

    // 토큰 생성
    const token = generateToken({ userId: user._id });

    res.status(201).json({
      success: true,
      message: "회원가입 성공!",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        intro: user.intro,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("회원가입 오류:", error);

    // MongoDB 중복 키 에러
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "이미 존재하는 사용자명 또는 이메일입니다.",
      });
    }

    // Mongoose 검증 에러
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "서버 오류",
      error: error.message,
    });
  }
};

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 기본 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "이메일과 비밀번호를 입력해주세요.",
      });
    }

    // 빈 값 검증
    if (email.trim() === "" || password.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "이메일과 비밀번호를 입력해주세요.",
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "올바른 이메일 형식을 입력해주세요.",
      });
    }

    // 사용자 찾기 (비밀번호 포함)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "존재하지 않는 사용자입니다.",
      });
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "비밀번호가 올바르지 않습니다.",
      });
    }

    // 토큰 생성
    const token = generateToken({ userId: user._id });

    res.json({
      success: true,
      message: "로그인 성공!",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        intro: user.intro,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류",
      error: error.message,
    });
  }
};
