const {
  publicRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectUserResponse,
  expectValidToken,
  cleanupTestData,
  TEST_USER,
} = require("../helpers/testHelpers");

describe("인증 API 테스트", () => {
  // 각 테스트 후 데이터 정리
  afterEach(async () => {
    await cleanupTestData();
  });

  describe("POST /api/auth/register - 회원가입", () => {
    test("올바른 데이터로 회원가입 성공", async () => {
      const userData = {
        username: "newuser",
        email: "newuser@example.com",
        password: "SecurePass123!",
      };

      const response = await publicRequest()
        .post("/api/auth/register")
        .send(userData);

      expectSuccessResponse(response, 201);
      expect(response.body.message).toBe("회원가입 성공!");

      // 토큰 검증
      expect(response.body).toHaveProperty("token");
      expectValidToken(response.body.token);

      // 사용자 정보 검증
      expect(response.body).toHaveProperty("user");
      expectUserResponse(response.body.user);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
    });

    test("필수 필드 누락 시 실패", async () => {
      const incompleteData = {
        username: "testuser",
        // email, password 누락
      };

      const response = await publicRequest()
        .post("/api/auth/register")
        .send(incompleteData);

      expectErrorResponse(response, 400);
    });

    test("잘못된 이메일 형식으로 실패", async () => {
      const invalidEmailData = {
        username: "testuser",
        email: "invalid-email",
        password: "SecurePass123!",
      };

      const response = await publicRequest()
        .post("/api/auth/register")
        .send(invalidEmailData);

      expectErrorResponse(response, 400);
    });

    test("짧은 비밀번호로 실패", async () => {
      const shortPasswordData = {
        username: "testuser",
        email: "test@example.com",
        password: "123",
      };

      const response = await publicRequest()
        .post("/api/auth/register")
        .send(shortPasswordData);

      expectErrorResponse(response, 400);
    });

    test("중복된 사용자명으로 실패", async () => {
      // 첫 번째 사용자 등록
      await publicRequest().post("/api/auth/register").send({
        username: "duplicateuser",
        email: "first@example.com",
        password: "SecurePass123!",
      });

      // 같은 사용자명으로 두 번째 등록 시도
      const response = await publicRequest().post("/api/auth/register").send({
        username: "duplicateuser",
        email: "second@example.com",
        password: "SecurePass123!",
      });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain("이미 존재하는");
    });

    test("중복된 이메일로 실패", async () => {
      // 첫 번째 사용자 등록
      await publicRequest().post("/api/auth/register").send({
        username: "firstuser",
        email: "duplicate@example.com",
        password: "SecurePass123!",
      });

      // 같은 이메일로 두 번째 등록 시도
      const response = await publicRequest().post("/api/auth/register").send({
        username: "seconduser",
        email: "duplicate@example.com",
        password: "SecurePass123!",
      });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain("이미 존재하는");
    });

    test("사용자명에 특수문자 포함 시 실패", async () => {
      const invalidUsernameData = {
        username: "test@user!",
        email: "test@example.com",
        password: "SecurePass123!",
      };

      const response = await publicRequest()
        .post("/api/auth/register")
        .send(invalidUsernameData);

      expectErrorResponse(response, 400);
    });

    test("너무 긴 사용자명으로 실패", async () => {
      const longUsernameData = {
        username: "a".repeat(25), // 20자 초과
        email: "test@example.com",
        password: "SecurePass123!",
      };

      const response = await publicRequest()
        .post("/api/auth/register")
        .send(longUsernameData);

      expectErrorResponse(response, 400);
    });
  });

  describe("POST /api/auth/login - 로그인", () => {
    test("올바른 자격증명으로 로그인 성공", async () => {
      // 먼저 사용자 등록
      const userData = {
        username: "loginuser",
        email: "login@example.com",
        password: "SecurePass123!",
      };

      await publicRequest().post("/api/auth/register").send(userData);

      // 로그인 시도
      const response = await publicRequest().post("/api/auth/login").send({
        email: userData.email,
        password: userData.password,
      });

      expectSuccessResponse(response, 200);
      expect(response.body.message).toBe("로그인 성공!");

      // 토큰 검증
      expect(response.body).toHaveProperty("token");
      expectValidToken(response.body.token);

      // 사용자 정보 검증
      expect(response.body).toHaveProperty("user");
      expectUserResponse(response.body.user);
      expect(response.body.user.email).toBe(userData.email);
    });

    test("존재하지 않는 이메일로 실패", async () => {
      const response = await publicRequest().post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "SomePassword123!",
      });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain("존재하지 않는");
    });

    test("잘못된 비밀번호로 실패", async () => {
      // 먼저 사용자 등록
      const userData = {
        username: "wrongpassuser",
        email: "wrongpass@example.com",
        password: "CorrectPass123!",
      };

      await publicRequest().post("/api/auth/register").send(userData);

      // 잘못된 비밀번호로 로그인 시도
      const response = await publicRequest().post("/api/auth/login").send({
        email: userData.email,
        password: "WrongPass123!",
      });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain("비밀번호가 올바르지 않습니다");
    });

    test("필수 필드 누락 시 실패", async () => {
      const response = await publicRequest().post("/api/auth/login").send({
        email: "test@example.com",
        // password 누락
      });

      expectErrorResponse(response, 400);
    });

    test("빈 이메일로 실패", async () => {
      const response = await publicRequest().post("/api/auth/login").send({
        email: "",
        password: "SomePassword123!",
      });

      expectErrorResponse(response, 400);
    });

    test("빈 비밀번호로 실패", async () => {
      const response = await publicRequest().post("/api/auth/login").send({
        email: "test@example.com",
        password: "",
      });

      expectErrorResponse(response, 400);
    });

    test("잘못된 이메일 형식으로 실패", async () => {
      const response = await publicRequest().post("/api/auth/login").send({
        email: "invalid-email-format",
        password: "SomePassword123!",
      });

      expectErrorResponse(response, 400);
    });
  });

  describe("인증 보안 테스트", () => {
    test("SQL 인젝션 시도 차단", async () => {
      const response = await publicRequest().post("/api/auth/login").send({
        email: "admin@test.com'; DROP TABLE users; --",
        password: "password",
      });

      expectErrorResponse(response, 400);
    });

    test("XSS 시도 차단", async () => {
      const response = await publicRequest().post("/api/auth/register").send({
        username: '<script>alert("xss")</script>',
        email: "xss@test.com",
        password: "password123",
      });

      expectErrorResponse(response, 400);
    });

    test("매우 긴 입력값 처리", async () => {
      const response = await publicRequest()
        .post("/api/auth/register")
        .send({
          username: "a".repeat(1000),
          email: "long@test.com",
          password: "password123",
        });

      expectErrorResponse(response, 400);
    });
  });
});
