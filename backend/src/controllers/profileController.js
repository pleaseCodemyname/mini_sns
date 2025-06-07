const User = require("../models/User");
const Post = require("../models/Post");
const bcrypt = require("bcryptjs");

// 내 프로필 조회
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 내가 작성한 게시물 수 조회
    const postsCount = await Post.countDocuments({ author: userId });

    res.json({
      message: "프로필 조회 성공",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        intro: user.intro,
        createdAt: user.createdAt,
        postsCount,
      },
    });
  } catch (error) {
    console.error("프로필 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 다른 사용자 프로필 조회
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 해당 사용자가 작성한 게시물 수 조회
    const postsCount = await Post.countDocuments({ author: userId });

    res.json({
      message: "프로필 조회 성공",
      user: {
        _id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        intro: user.intro,
        createdAt: user.createdAt,
        postsCount,
      },
    });
  } catch (error) {
    console.error("프로필 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 프로필 수정
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, intro, profileImage } = req.body;

    // 사용자 찾기
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 입력값 검증
    if (username && username.trim() !== "") {
      if (username.length < 2 || username.length > 20) {
        return res
          .status(400)
          .json({ message: "사용자명은 2-20자 사이여야 합니다." });
      }

      // 사용자명 중복 확인 (자신 제외)
      const existingUser = await User.findOne({
        username: username,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "이미 사용중인 사용자명입니다." });
      }

      user.username = username.trim();
    }

    if (intro !== undefined) {
      if (intro.length > 200) {
        return res
          .status(400)
          .json({ message: "자기소개는 200자 이하로 작성해주세요." });
      }
      user.intro = intro.trim();
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    await user.save();

    res.json({
      message: "프로필 수정 성공!",
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
    console.error("프로필 수정 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 비밀번호 변경
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // 입력값 검증
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "새 비밀번호는 6자 이상이어야 합니다." });
    }

    // 사용자 찾기
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res
        .status(400)
        .json({ message: "현재 비밀번호가 올바르지 않습니다." });
    }

    // 새 비밀번호 해싱
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 비밀번호 업데이트
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: "비밀번호 변경 성공!" });
  } catch (error) {
    console.error("비밀번호 변경 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 내가 작성한 게시물 조회
exports.getMyPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const posts = await Post.find({ author: userId })
      .populate("author", "username profileImage")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalPosts = await Post.countDocuments({ author: userId });

    res.json({
      message: "내 게시물 조회 성공",
      posts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    console.error("내 게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 특정 사용자의 게시물 조회
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const posts = await Post.find({ author: userId })
      .populate("author", "username profileImage")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalPosts = await Post.countDocuments({ author: userId });

    res.json({
      message: "사용자 게시물 조회 성공",
      posts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    console.error("사용자 게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
