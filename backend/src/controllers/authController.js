const User = require("../models/User");
const jwt = require("jsonwebtoken");

// JWT 토큰 생성 함수
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

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

    // 토큰 생성
    const token = generateToken(user._id);

    res.status(201).json({
      message: "회원가입 성공!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 사용자 찾기
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "존재하지 않는 사용자입니다." });
    }

    // 비밀번호 확인 (나중에 구현)
    // 지금은 일단 로그인 성공으로 처리
    const token = generateToken(user._id);

    res.json({
      message: "로그인 성공!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
