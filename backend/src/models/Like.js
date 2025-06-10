const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    // 좋아요를 누른 사용자
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 좋아요를 받은 게시물
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 중복 좋아요 방지를 위한 복합 인덱스
likeSchema.index({ user: 1, post: 1 }, { unique: true });

// 게시물별 좋아요 조회를 위한 인덱스
likeSchema.index({ post: 1, createdAt: -1 });

// 사용자별 좋아요 조회를 위한 인덱스
likeSchema.index({ user: 1, createdAt: -1 });

// 좋아요 생성 시 중복 체크 정적 메서드
likeSchema.statics.toggleLike = async function (userId, postId) {
  try {
    // 기존 좋아요 찾기
    const existingLike = await this.findOne({ user: userId, post: postId });

    if (existingLike) {
      // 이미 좋아요가 있으면 삭제 (좋아요 취소)
      await this.findByIdAndDelete(existingLike._id);
      return {
        isLiked: false,
        message: "좋아요가 취소되었습니다.",
        likeId: null,
      };
    } else {
      // 좋아요가 없으면 생성 (좋아요 추가)
      const newLike = await this.create({ user: userId, post: postId });
      return {
        isLiked: true,
        message: "좋아요가 추가되었습니다.",
        likeId: newLike._id,
        like: newLike,
      };
    }
  } catch (error) {
    if (error.code === 11000) {
      // 중복 키 에러 (동시성 문제)
      throw new Error("이미 좋아요를 누르셨습니다.");
    }
    throw new Error("좋아요 처리 중 오류가 발생했습니다: " + error.message);
  }
};

// 게시물의 좋아요 수 조회 정적 메서드
likeSchema.statics.getPostLikeCount = async function (postId) {
  try {
    const count = await this.countDocuments({ post: postId });
    return count;
  } catch (error) {
    throw new Error("좋아요 수 조회 중 오류가 발생했습니다.");
  }
};

// 사용자가 특정 게시물에 좋아요를 했는지 확인하는 정적 메서드
likeSchema.statics.isLikedByUser = async function (userId, postId) {
  try {
    const like = await this.findOne({ user: userId, post: postId });
    return !!like;
  } catch (error) {
    throw new Error("좋아요 상태 확인 중 오류가 발생했습니다.");
  }
};

// 게시물의 좋아요 목록 조회 (페이지네이션 포함)
likeSchema.statics.getPostLikes = async function (
  postId,
  page = 1,
  limit = 20
) {
  try {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.find({ post: postId })
        .populate("user", "username profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      this.countDocuments({ post: postId }),
    ]);

    return {
      likes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new Error("좋아요 목록 조회 중 오류가 발생했습니다.");
  }
};

// 사용자가 좋아요한 게시물 목록 조회
likeSchema.statics.getUserLikedPosts = async function (
  userId,
  page = 1,
  limit = 10
) {
  try {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.find({ user: userId })
        .populate({
          path: "post",
          populate: {
            path: "author",
            select: "username profileImage",
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      this.countDocuments({ user: userId }),
    ]);

    // 게시물만 추출
    const posts = likes.map((like) => like.post).filter((post) => post); // null 체크

    return {
      posts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new Error("좋아요한 게시물 조회 중 오류가 발생했습니다.");
  }
};

module.exports = mongoose.model("Like", likeSchema);
