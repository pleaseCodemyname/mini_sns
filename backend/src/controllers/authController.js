// 인증 컨트롤러 --> 클라이언트 요청 처리, 모델과 상호작용하여 적절한 응답 반환(비즈니스 로직 담당)
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt"); // JWT 유틸리티 사용

// 회원가입
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 사용자 존재 여부 확인
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "이미 존재하는 사용자명 또는 이메일입니다.",
      });
    }

    // 새 사용자 생성
    const user = new User({ username, email, password });
    await user.save();

    // 토큰 생성 (유틸리티 함수 사용)
    const token = generateToken({ userId: user._id });

    res.status(201).json({
      message: "회원가입 성공!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        intro: user.intro,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 사용자 찾기 (비밀번호 포함)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "존재하지 않는 사용자입니다." });
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "비밀번호가 올바르지 않습니다." });
    }

    // 토큰 생성 (유틸리티 함수 사용)
    const token = generateToken({ userId: user._id });

    res.json({
      message: "로그인 성공!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        intro: user.intro,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
