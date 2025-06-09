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
likeSchema.index({ post: 1 });

// 사용자별 좋아요 조회를 위한 인덱스
likeSchema.index({ user: 1 });

// 좋아요 생성 시 중복 체크 정적 메서드
likeSchema.statics.toggleLike = async function (userId, postId) {
  try {
    // 기존 좋아요 찾기
    const existingLike = await this.findOne({ user: userId, post: postId });

    if (existingLike) {
      // 이미 좋아요가 있으면 삭제 (좋아요 취소)
      await this.findByIdAndDelete(existingLike._id);
      return { isLiked: false, message: "좋아요가 취소되었습니다." };
    } else {
      // 좋아요가 없으면 생성 (좋아요 추가)
      const newLike = await this.create({ user: userId, post: postId });
      return {
        isLiked: true,
        message: "좋아요가 추가되었습니다.",
        like: newLike,
      };
    }
  } catch (error) {
    throw new Error("좋아요 처리 중 오류가 발생했습니다.");
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

// 게시물 삭제 시 관련 좋아요도 삭제하는 미들웨어
likeSchema.pre("remove", { document: true, query: false }, async function () {
  console.log(`좋아요 삭제: ${this._id}`);
});

module.exports = mongoose.model("Like", likeSchema);
