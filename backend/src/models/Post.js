// 게시글 DB
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "게시물 내용은 필수입니다."],
      trim: true,
      maxlength: [1000, "게시물은 1000자 이하로 작성해주세요."],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "작성자는 필수입니다."],
      index: true, // 사용자별 게시물 조회를 위한 인덱스
    },
    images: [
      {
        type: String,
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
          },
          message: "올바른 이미지 URL 형식이 아닙니다.",
        },
      },
    ], // 단일 image에서 images 배열로 변경
    // likes와 comments 내장 배열 제거 - 별도 모델 사용

    // 게시물 상태
    isActive: {
      type: Boolean,
      default: true,
    },

    // 해시태그 (옵션)
    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 가상 필드: 좋아요 수
postSchema.virtual("likesCount", {
  ref: "Like",
  localField: "_id",
  foreignField: "post",
  count: true,
});

// 가상 필드: 댓글 수
postSchema.virtual("commentsCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "post",
  count: true,
});

// 가상 필드가 JSON에 포함되도록 설정
postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

// 인덱스 설정
postSchema.index({ author: 1, createdAt: -1 }); // 사용자별 게시물 조회
postSchema.index({ createdAt: -1 }); // 최신 게시물 조회
postSchema.index({ hashtags: 1 }); // 해시태그 검색
postSchema.index({ content: "text" }); // 텍스트 검색

// 게시물 통계 조회 메서드
postSchema.methods.getStats = async function () {
  const Like = require("./Like");
  const Comment = require("./Comment");

  const [likesCount, commentsCount] = await Promise.all([
    Like.countDocuments({ post: this._id }),
    Comment.countDocuments({ post: this._id }),
  ]);

  return {
    likesCount,
    commentsCount,
  };
};

// 사용자가 이 게시물을 좋아요했는지 확인하는 메서드
postSchema.methods.isLikedByUser = async function (userId) {
  if (!userId) return false;

  const Like = require("./Like");
  const like = await Like.findOne({ post: this._id, user: userId });
  return !!like;
};

// 게시물 삭제 시 관련 데이터도 삭제하는 미들웨어
postSchema.pre("remove", { document: true, query: false }, async function () {
  const Like = require("./Like");
  const Comment = require("./Comment");
  const Notification = require("./Notification");

  // 관련된 좋아요, 댓글, 알림 삭제
  await Promise.all([
    Like.deleteMany({ post: this._id }),
    Comment.deleteMany({ post: this._id }),
    Notification.deleteMany({ post: this._id }),
  ]);
});

// findByIdAndDelete에도 적용
postSchema.pre("findOneAndDelete", async function () {
  const Like = require("./Like");
  const Comment = require("./Comment");
  const Notification = require("./Notification");

  const postId = this.getQuery()._id;

  await Promise.all([
    Like.deleteMany({ post: postId }),
    Comment.deleteMany({ post: postId }),
    Notification.deleteMany({ post: postId }),
  ]);
});

module.exports = mongoose.model("Post", postSchema);
