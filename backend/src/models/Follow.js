const mongoose = require("mongoose");

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 복합 인덱스: 같은 사용자가 같은 사람을 중복 팔로우 방지
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// 성능을 위한 인덱스
followSchema.index({ follower: 1 });
followSchema.index({ following: 1 });

module.exports = mongoose.model("Follow", followSchema);
