const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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

// 게시물별 댓글 수를 빠르게 조회하기 위한 인덱스
commentSchema.index({ post: 1 });

// 사용자별 댓글을 조회하기 위한 인덱스
commentSchema.index({ author: 1 });

module.exports = mongoose.model("Comment", commentSchema);
