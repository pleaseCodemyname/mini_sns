// 인증 컨트롤러 --> 클라이언트 요청 처리, 모델과 상호작용하여 적절한 응답 반환(비즈니스 로직 담당)
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// JWT 토큰 생성 함수 : 토큰 생성 및 반환 --> 클라이언트 전달 후 인증에 사용
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// 회원가입
exports.register = async (req, res) => {
  // exports.register: 회원가입 기능 외부에서 사용할 수 있도록
  try {
    const { username, email, password } = req.body; // 사용자가 입력한 것 username, email, password에 넣음

    // 사용자 존재 여부 확인
    const existingUser = await User.findOne({
      $or: [{ email }, { username }], // $or은 email또는 username 중 하나라도 존재하는 사용자를 찾음
    });

    if (existingUser) {
      return res.status(400).json({
        message: "이미 존재하는 사용자명 또는 이메일입니다.",
      });
    }

    // 새 사용자 생성
    const user = new User({ username, email, password }); // User모델을 기반으로 새로운 객체 생성, intro는 required 아님
    await user.save();

    // 토큰 생성
    const token = generateToken(user._id); // _id는 PK임, 자동으로 생성되는 ObjectId형태의 값

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
