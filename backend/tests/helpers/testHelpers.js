const request = require("supertest");
const { app } = require("../../app");
const User = require("../../src/models/User");
const Post = require("../../src/models/Post");
const Comment = require("../../src/models/Comment");
const Like = require("../../src/models/Like");
const Follow = require("../../src/models/Follow");
const Notification = require("../../src/models/Notification");
const { generateToken } = require("../../src/utils/jwt");

/**
 * 테스트용 사용자 생성
 */
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    username: `testuser${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: "TestPass123!",
  };

  const user = new User({ ...defaultUser, ...userData });
  await user.save();

  const token = generateToken({ userId: user._id });

  return { user, token };
};

/**
 * 여러 테스트 사용자 생성
 */
const createMultipleTestUsers = async (count = 3) => {
  const users = [];

  for (let i = 0; i < count; i++) {
    const userData = {
      username: `testuser${i}_${Date.now()}`,
      email: `test${i}_${Date.now()}@example.com`,
      password: "TestPass123!",
    };

    const { user, token } = await createTestUser(userData);
    users.push({ user, token });
  }

  return users;
};

/**
 * 테스트용 게시물 생성
 */
const createTestPost = async (authorId, postData = {}) => {
  const defaultPost = {
    content: `테스트 게시물 ${Date.now()}`,
    author: authorId,
    images: [],
    hashtags: ["테스트"],
  };

  const post = new Post({ ...defaultPost, ...postData });
  await post.save();

  return post;
};

/**
 * 테스트용 댓글 생성
 */
const createTestComment = async (authorId, postId, commentData = {}) => {
  const defaultComment = {
    content: `테스트 댓글 ${Date.now()}`,
    author: authorId,
    post: postId,
  };

  const comment = new Comment({ ...defaultComment, ...commentData });
  await comment.save();

  return comment;
};

/**
 * 테스트용 좋아요 생성
 */
const createTestLike = async (userId, postId) => {
  const like = new Like({
    user: userId,
    post: postId,
  });

  await like.save();
  return like;
};

/**
 * 테스트용 팔로우 관계 생성
 */
const createTestFollow = async (followerId, followingId) => {
  const follow = new Follow({
    follower: followerId,
    following: followingId,
  });

  await follow.save();
  return follow;
};

/**
 * 테스트용 알림 생성
 */
const createTestNotification = async (notificationData) => {
  const defaultNotification = {
    recipient: notificationData.recipient,
    sender: notificationData.sender,
    type: notificationData.type || "follow",
    message: notificationData.message || "테스트 알림",
    isRead: false,
  };

  const notification = new Notification({
    ...defaultNotification,
    ...notificationData,
  });
  await notification.save();

  return notification;
};

/**
 * 인증된 요청 생성
 */
const authenticatedRequest = (token) => {
  return request(app).set("Authorization", `Bearer ${token}`);
};

/**
 * 일반 요청 생성
 */
const publicRequest = () => {
  return request(app);
};

/**
 * 모든 테스트 데이터 정리
 */
const cleanupTestData = async () => {
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Like.deleteMany({}),
    Follow.deleteMany({}),
    Notification.deleteMany({}),
  ]);
};

/**
 * 응답 검증 헬퍼
 */
const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty("success", true);
  expect(response.body).toHaveProperty("message");
};

const expectErrorResponse = (response, statusCode = 400) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty("success", false);
  expect(response.body).toHaveProperty("message");
};

/**
 * 사용자 응답 검증
 */
const expectUserResponse = (user) => {
  expect(user).toHaveProperty("_id");
  expect(user).toHaveProperty("username");
  expect(user).toHaveProperty("email");
  expect(user).not.toHaveProperty("password"); // 비밀번호는 응답에 없어야 함
  expect(user).toHaveProperty("createdAt");
};

/**
 * 게시물 응답 검증
 */
const expectPostResponse = (post) => {
  expect(post).toHaveProperty("_id");
  expect(post).toHaveProperty("content");
  expect(post).toHaveProperty("author");
  expect(post).toHaveProperty("images");
  expect(post).toHaveProperty("hashtags");
  expect(post).toHaveProperty("likesCount");
  expect(post).toHaveProperty("commentsCount");
  expect(post).toHaveProperty("isLiked");
  expect(post).toHaveProperty("createdAt");
  expect(post).toHaveProperty("updatedAt");
};

/**
 * 댓글 응답 검증
 */
const expectCommentResponse = (comment) => {
  expect(comment).toHaveProperty("_id");
  expect(comment).toHaveProperty("content");
  expect(comment).toHaveProperty("author");
  expect(comment).toHaveProperty("post");
  expect(comment).toHaveProperty("createdAt");
  expect(comment).toHaveProperty("updatedAt");
};

/**
 * 페이지네이션 응답 검증
 */
const expectPaginationResponse = (response) => {
  expect(response.body).toHaveProperty("currentPage");
  expect(response.body).toHaveProperty("totalPages");
  expect(response.body.currentPage).toBeGreaterThanOrEqual(1);
  expect(response.body.totalPages).toBeGreaterThanOrEqual(0);
};

/**
 * JWT 토큰 검증
 */
const expectValidToken = (token) => {
  expect(token).toBeDefined();
  expect(typeof token).toBe("string");
  expect(token.split(".")).toHaveLength(3); // JWT는 3부분으로 구성
};

/**
 * ObjectId 검증
 */
const expectValidObjectId = (id) => {
  expect(id).toBeDefined();
  expect(typeof id).toBe("string");
  expect(id).toMatch(/^[0-9a-fA-F]{24}$/); // MongoDB ObjectId 패턴
};

module.exports = {
  // 데이터 생성 헬퍼
  createTestUser,
  createMultipleTestUsers,
  createTestPost,
  createTestComment,
  createTestLike,
  createTestFollow,
  createTestNotification,

  // 요청 헬퍼
  authenticatedRequest,
  publicRequest,

  // 정리 헬퍼
  cleanupTestData,

  // 검증 헬퍼
  expectSuccessResponse,
  expectErrorResponse,
  expectUserResponse,
  expectPostResponse,
  expectCommentResponse,
  expectPaginationResponse,
  expectValidToken,
  expectValidObjectId,

  // 상수
  TEST_USER: {
    username: "testuser",
    email: "test@example.com",
    password: "TestPass123!",
  },

  TEST_POST: {
    content: "테스트 게시물입니다.",
    hashtags: ["테스트", "게시물"],
  },

  TEST_COMMENT: {
    content: "테스트 댓글입니다.",
  },
};
