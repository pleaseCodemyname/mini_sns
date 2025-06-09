const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // 알림을 받는 사용자
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 알림을 발생시킨 사용자
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 알림 타입
    type: {
      type: String,
      enum: ["follow", "like", "comment"],
      required: true,
    },
    // 관련 게시물 (좋아요, 댓글인 경우)
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: function () {
        return this.type === "like" || this.type === "comment";
      },
    },
    // 댓글 내용 (댓글 알림인 경우)
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: function () {
        return this.type === "comment";
      },
    },
    // 알림 메시지
    message: {
      type: String,
      required: true,
    },
    // 읽음 여부
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스 설정 (알림 조회 성능 향상)
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// 알림 메시지 자동 생성 메서드
notificationSchema.methods.generateMessage = function () {
  switch (this.type) {
    case "follow":
      return `${this.sender.username}님이 당신을 팔로우했습니다.`;
    case "like":
      return `${this.sender.username}님이 당신의 게시물을 좋아합니다.`;
    case "comment":
      return `${this.sender.username}님이 당신의 게시물에 댓글을 달았습니다.`;
    default:
      return "새로운 알림이 있습니다.";
  }
};

// 중복 알림 방지를 위한 정적 메서드
notificationSchema.statics.createNotification = async function (data) {
  // 24시간 이내에 같은 타입의 알림이 있는지 확인
  const existingNotification = await this.findOne({
    recipient: data.recipient,
    sender: data.sender,
    type: data.type,
    post: data.post || null,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  // 중복 알림이 있으면 생성하지 않음
  if (existingNotification) {
    return null;
  }

  // 자기 자신에게는 알림 보내지 않음
  if (data.recipient.toString() === data.sender.toString()) {
    return null;
  }

  return await this.create(data);
};

module.exports = mongoose.model("Notification", notificationSchema);
