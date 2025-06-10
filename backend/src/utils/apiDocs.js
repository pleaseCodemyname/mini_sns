/**
 * API 문서화 도구
 * Swagger/OpenAPI 스펙 없이 간단한 API 문서 생성
 */

const fs = require("fs");
const path = require("path");

/**
 * API 엔드포인트 정보를 수집하고 문서화하는 클래스
 */
class APIDocumentationGenerator {
  constructor() {
    this.routes = [];
    this.models = {};
    this.middlewares = {};
  }

  /**
   * 라우트 정보 등록
   */
  addRoute(method, path, description, options = {}) {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      description,
      auth: options.auth || false,
      params: options.params || [],
      query: options.query || [],
      body: options.body || {},
      responses: options.responses || {},
      examples: options.examples || {},
      tags: options.tags || [],
    });
  }

  /**
   * 모델 스키마 등록
   */
  addModel(name, schema) {
    this.models[name] = schema;
  }

  /**
   * 미들웨어 정보 등록
   */
  addMiddleware(name, description, usage = []) {
    this.middlewares[name] = { description, usage };
  }

  /**
   * Markdown 형식의 API 문서 생성
   */
  generateMarkdownDocs() {
    let markdown = `# Mini SNS API Documentation\n\n`;
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;

    // 목차
    markdown += `## 목차\n`;
    markdown += `- [개요](#개요)\n`;
    markdown += `- [인증](#인증)\n`;
    markdown += `- [에러 처리](#에러-처리)\n`;
    markdown += `- [모델](#모델)\n`;
    markdown += `- [API 엔드포인트](#api-엔드포인트)\n`;
    markdown += `- [미들웨어](#미들웨어)\n\n`;

    // 개요
    markdown += `## 개요\n\n`;
    markdown += `Mini SNS는 간단한 소셜 네트워크 서비스 API입니다.\n\n`;
    markdown += `**Base URL:** \`http://localhost:3000/api\`\n\n`;

    // 인증
    markdown += `## 인증\n\n`;
    markdown += `API는 JWT(JSON Web Token)를 사용한 Bearer 토큰 인증을 사용합니다.\n\n`;
    markdown += `**헤더 형식:**\n`;
    markdown += `\`\`\`\n`;
    markdown += `Authorization: Bearer <your-jwt-token>\n`;
    markdown += `\`\`\`\n\n`;

    // 에러 처리
    markdown += `## 에러 처리\n\n`;
    markdown += `모든 API 응답은 다음 형식을 따릅니다:\n\n`;
    markdown += `**성공 응답:**\n`;
    markdown += `\`\`\`json\n`;
    markdown += `{\n`;
    markdown += `  "success": true,\n`;
    markdown += `  "message": "요청이 성공적으로 처리되었습니다.",\n`;
    markdown += `  "data": {...}\n`;
    markdown += `}\n`;
    markdown += `\`\`\`\n\n`;
    markdown += `**에러 응답:**\n`;
    markdown += `\`\`\`json\n`;
    markdown += `{\n`;
    markdown += `  "success": false,\n`;
    markdown += `  "message": "에러 메시지"\n`;
    markdown += `}\n`;
    markdown += `\`\`\`\n\n`;

    // 공통 HTTP 상태 코드
    markdown += `### HTTP 상태 코드\n\n`;
    markdown += `| 코드 | 의미 | 설명 |\n`;
    markdown += `|------|------|------|\n`;
    markdown += `| 200 | OK | 요청 성공 |\n`;
    markdown += `| 201 | Created | 리소스 생성 성공 |\n`;
    markdown += `| 400 | Bad Request | 잘못된 요청 |\n`;
    markdown += `| 401 | Unauthorized | 인증 필요 |\n`;
    markdown += `| 403 | Forbidden | 권한 없음 |\n`;
    markdown += `| 404 | Not Found | 리소스 없음 |\n`;
    markdown += `| 409 | Conflict | 리소스 충돌 |\n`;
    markdown += `| 500 | Internal Server Error | 서버 오류 |\n\n`;

    // 모델
    markdown += `## 모델\n\n`;
    for (const [modelName, schema] of Object.entries(this.models)) {
      markdown += `### ${modelName}\n\n`;
      markdown += `\`\`\`json\n`;
      markdown += JSON.stringify(schema, null, 2);
      markdown += `\n\`\`\`\n\n`;
    }

    // API 엔드포인트
    markdown += `## API 엔드포인트\n\n`;

    const groupedRoutes = this.groupRoutesByTag();

    for (const [tag, routes] of Object.entries(groupedRoutes)) {
      markdown += `### ${tag}\n\n`;

      for (const route of routes) {
        markdown += `#### ${route.method} ${route.path}\n\n`;
        markdown += `${route.description}\n\n`;

        if (route.auth) {
          markdown += `🔐 **인증 필요**\n\n`;
        }

        // 파라미터
        if (route.params.length > 0) {
          markdown += `**Path Parameters:**\n\n`;
          for (const param of route.params) {
            markdown += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          }
          markdown += `\n`;
        }

        // 쿼리 파라미터
        if (route.query.length > 0) {
          markdown += `**Query Parameters:**\n\n`;
          for (const query of route.query) {
            const required = query.required ? " **(필수)**" : " (선택)";
            markdown += `- \`${query.name}\` (${query.type})${required}: ${query.description}\n`;
          }
          markdown += `\n`;
        }

        // 요청 본문
        if (Object.keys(route.body).length > 0) {
          markdown += `**Request Body:**\n\n`;
          markdown += `\`\`\`json\n`;
          markdown += JSON.stringify(route.body, null, 2);
          markdown += `\n\`\`\`\n\n`;
        }

        // 응답 예시
        if (Object.keys(route.responses).length > 0) {
          markdown += `**Responses:**\n\n`;
          for (const [statusCode, response] of Object.entries(
            route.responses
          )) {
            markdown += `**${statusCode}:**\n`;
            markdown += `\`\`\`json\n`;
            markdown += JSON.stringify(response, null, 2);
            markdown += `\n\`\`\`\n\n`;
          }
        }

        // 예시
        if (Object.keys(route.examples).length > 0) {
          markdown += `**Examples:**\n\n`;
          for (const [exampleName, example] of Object.entries(route.examples)) {
            markdown += `**${exampleName}:**\n`;
            markdown += `\`\`\`bash\n`;
            markdown += `curl -X ${route.method} \\\n`;
            markdown += `  "${
              example.url || "http://localhost:3000/api" + route.path
            }" \\\n`;
            if (route.auth) {
              markdown += `  -H "Authorization: Bearer <your-token>" \\\n`;
            }
            markdown += `  -H "Content-Type: application/json"`;
            if (example.body) {
              markdown += ` \\\n  -d '${JSON.stringify(example.body)}'`;
            }
            markdown += `\n\`\`\`\n\n`;
          }
        }

        markdown += `---\n\n`;
      }
    }

    // 미들웨어
    markdown += `## 미들웨어\n\n`;
    for (const [name, info] of Object.entries(this.middlewares)) {
      markdown += `### ${name}\n\n`;
      markdown += `${info.description}\n\n`;
      if (info.usage.length > 0) {
        markdown += `**사용 예시:**\n`;
        for (const usage of info.usage) {
          markdown += `- ${usage}\n`;
        }
        markdown += `\n`;
      }
    }

    return markdown;
  }

  /**
   * 라우트를 태그별로 그룹화
   */
  groupRoutesByTag() {
    const grouped = {};

    for (const route of this.routes) {
      const tag = route.tags.length > 0 ? route.tags[0] : "Default";
      if (!grouped[tag]) {
        grouped[tag] = [];
      }
      grouped[tag].push(route);
    }

    return grouped;
  }

  /**
   * JSON 형식으로 API 스펙 내보내기
   */
  exportToJSON() {
    return {
      info: {
        title: "Mini SNS API",
        version: "1.0.0",
        description: "간단한 소셜 네트워크 서비스 API",
        generatedAt: new Date().toISOString(),
      },
      baseUrl: "http://localhost:3000/api",
      routes: this.routes,
      models: this.models,
      middlewares: this.middlewares,
    };
  }

  /**
   * 파일로 문서 저장
   */
  async saveToFile(format = "markdown", filename = null) {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "markdown") {
      const content = this.generateMarkdownDocs();
      const defaultFilename = `api-docs-${timestamp}.md`;
      const filepath = path.join(process.cwd(), filename || defaultFilename);

      await fs.promises.writeFile(filepath, content, "utf8");
      console.log(`📖 API 문서가 생성되었습니다: ${filepath}`);
      return filepath;
    } else if (format === "json") {
      const content = JSON.stringify(this.exportToJSON(), null, 2);
      const defaultFilename = `api-spec-${timestamp}.json`;
      const filepath = path.join(process.cwd(), filename || defaultFilename);

      await fs.promises.writeFile(filepath, content, "utf8");
      console.log(`📋 API 스펙이 생성되었습니다: ${filepath}`);
      return filepath;
    }

    throw new Error(`지원하지 않는 형식: ${format}`);
  }
}

/**
 * Mini SNS API 문서 정의
 */
function createMiniSNSAPIDocs() {
  const docs = new APIDocumentationGenerator();

  // 모델 정의
  docs.addModel("User", {
    _id: "ObjectId",
    username: "string",
    email: "string",
    profileImage: "string | null",
    intro: "string",
    isActive: "boolean",
    lastLoginAt: "Date | null",
    createdAt: "Date",
    updatedAt: "Date",
  });

  docs.addModel("Post", {
    _id: "ObjectId",
    content: "string",
    images: "string[]",
    hashtags: "string[]",
    author: "ObjectId (User)",
    isActive: "boolean",
    createdAt: "Date",
    updatedAt: "Date",
  });

  docs.addModel("Comment", {
    _id: "ObjectId",
    content: "string",
    author: "ObjectId (User)",
    post: "ObjectId (Post)",
    createdAt: "Date",
    updatedAt: "Date",
  });

  docs.addModel("Like", {
    _id: "ObjectId",
    user: "ObjectId (User)",
    post: "ObjectId (Post)",
    createdAt: "Date",
    updatedAt: "Date",
  });

  docs.addModel("Follow", {
    _id: "ObjectId",
    follower: "ObjectId (User)",
    following: "ObjectId (User)",
    createdAt: "Date",
  });

  docs.addModel("Notification", {
    _id: "ObjectId",
    recipient: "ObjectId (User)",
    sender: "ObjectId (User)",
    type: "string (follow, like, comment)",
    post: "ObjectId (Post) | null",
    comment: "ObjectId (Comment) | null",
    message: "string",
    isRead: "boolean",
    createdAt: "Date",
    updatedAt: "Date",
  });

  // 미들웨어 정의
  docs.addMiddleware("auth", "JWT 토큰 인증 미들웨어", [
    'router.get("/protected", auth, controller)',
    'router.post("/create", auth, validateInput, controller)',
  ]);

  docs.addMiddleware("validatePagination", "페이지네이션 파라미터 검증", [
    'router.get("/posts", validatePagination, getPosts)',
  ]);

  docs.addMiddleware("validateObjectId", "MongoDB ObjectId 형식 검증", [
    'router.get("/posts/:id", validateObjectId("id"), getPost)',
  ]);

  // 인증 관련 라우트
  docs.addRoute("POST", "/auth/register", "회원가입", {
    tags: ["Authentication"],
    body: {
      username: "string",
      email: "string",
      password: "string",
      confirmPassword: "string",
    },
    responses: {
      201: {
        success: true,
        message: "회원가입 성공!",
        token: "jwt-token",
        user: {
          id: "string",
          username: "string",
          email: "string",
          profileImage: null,
          intro: "string",
          createdAt: "Date",
        },
      },
      400: {
        success: false,
        message: "이미 존재하는 사용자명 또는 이메일입니다.",
      },
    },
    examples: {
      "Basic Registration": {
        body: {
          username: "johndoe",
          email: "john@example.com",
          password: "SecurePass123!",
          confirmPassword: "SecurePass123!",
        },
      },
    },
  });

  docs.addRoute("POST", "/auth/login", "로그인", {
    tags: ["Authentication"],
    body: {
      email: "string",
      password: "string",
    },
    responses: {
      200: {
        success: true,
        message: "로그인 성공!",
        token: "jwt-token",
        user: {
          id: "string",
          username: "string",
          email: "string",
          profileImage: "string | null",
          intro: "string",
          createdAt: "Date",
        },
      },
      400: {
        success: false,
        message: "존재하지 않는 사용자입니다.",
      },
    },
    examples: {
      "Basic Login": {
        body: {
          email: "john@example.com",
          password: "SecurePass123!",
        },
      },
    },
  });

  // 사용자 관련 라우트
  docs.addRoute("GET", "/users/me", "내 프로필 조회", {
    auth: true,
    tags: ["Users"],
    responses: {
      200: {
        success: true,
        message: "프로필 조회 성공",
        user: {
          _id: "string",
          username: "string",
          email: "string",
          profileImage: "string | null",
          intro: "string",
          postsCount: "number",
          followersCount: "number",
          followingCount: "number",
          createdAt: "Date",
          updatedAt: "Date",
        },
      },
      401: {
        success: false,
        message: "로그인이 필요합니다.",
      },
    },
  });

  docs.addRoute("PUT", "/users/me", "내 프로필 수정", {
    auth: true,
    tags: ["Users"],
    body: {
      username: "string (optional)",
      intro: "string (optional)",
    },
    responses: {
      200: {
        success: true,
        message: "프로필 수정 성공!",
        user: "User 객체",
      },
      400: {
        success: false,
        message: "이미 사용중인 사용자명입니다.",
      },
    },
  });

  docs.addRoute("GET", "/users/search", "사용자 검색", {
    tags: ["Users"],
    query: [
      { name: "q", type: "string", required: true, description: "검색어" },
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호 (기본값: 1)",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기 (기본값: 10)",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "사용자 검색 성공",
        searchTerm: "string",
        users: [],
        totalUsers: "number",
        currentPage: "number",
        totalPages: "number",
      },
      400: {
        success: false,
        message: "검색어를 입력해주세요.",
      },
    },
  });

  docs.addRoute("GET", "/users/:userId", "특정 사용자 프로필 조회", {
    tags: ["Users"],
    params: [{ name: "userId", type: "string", description: "사용자 ID" }],
    responses: {
      200: {
        success: true,
        message: "프로필 조회 성공",
        user: {
          _id: "string",
          username: "string",
          profileImage: "string | null",
          intro: "string",
          postsCount: "number",
          followersCount: "number",
          followingCount: "number",
          isFollowing: "boolean",
          isFollowedBy: "boolean",
          isMutual: "boolean",
          createdAt: "Date",
        },
      },
      404: {
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      },
    },
  });

  // 게시물 관련 라우트
  docs.addRoute("GET", "/posts", "모든 게시물 조회", {
    tags: ["Posts"],
    query: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호 (기본값: 1)",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기 (기본값: 10)",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "게시물 조회 성공",
        posts: [],
        totalPosts: "number",
        currentPage: "number",
        totalPages: "number",
      },
    },
  });

  docs.addRoute("POST", "/posts", "게시물 작성", {
    auth: true,
    tags: ["Posts"],
    body: {
      content: "string",
      images: "string[] (optional)",
      hashtags: "string[] (optional)",
    },
    responses: {
      201: {
        success: true,
        message: "게시물 작성 성공!",
        post: {
          _id: "string",
          content: "string",
          images: "string[]",
          hashtags: "string[]",
          author: "User 객체",
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          createdAt: "Date",
          updatedAt: "Date",
        },
      },
      400: {
        success: false,
        message: "게시물 내용을 입력해주세요.",
      },
    },
    examples: {
      "Simple Post": {
        body: {
          content: "안녕하세요! 첫 번째 게시물입니다.",
          hashtags: ["첫게시물", "안녕하세요"],
        },
      },
    },
  });

  docs.addRoute("GET", "/posts/:id", "특정 게시물 조회", {
    tags: ["Posts"],
    params: [{ name: "id", type: "string", description: "게시물 ID" }],
    responses: {
      200: {
        success: true,
        message: "게시물 조회 성공",
        post: "Post 객체 (통계 포함)",
      },
      404: {
        success: false,
        message: "게시물을 찾을 수 없습니다.",
      },
    },
  });

  docs.addRoute("PUT", "/posts/:id", "게시물 수정", {
    auth: true,
    tags: ["Posts"],
    params: [{ name: "id", type: "string", description: "게시물 ID" }],
    body: {
      content: "string",
      images: "string[] (optional)",
      hashtags: "string[] (optional)",
    },
    responses: {
      200: {
        success: true,
        message: "게시물 수정 성공!",
        post: "Post 객체",
      },
      403: {
        success: false,
        message: "게시물을 수정할 권한이 없습니다.",
      },
    },
  });

  docs.addRoute("DELETE", "/posts/:id", "게시물 삭제 (소프트)", {
    auth: true,
    tags: ["Posts"],
    params: [{ name: "id", type: "string", description: "게시물 ID" }],
    responses: {
      200: {
        success: true,
        message: "게시물 삭제 성공!",
        deletedPostId: "string",
      },
      403: {
        success: false,
        message: "게시물을 삭제할 권한이 없습니다.",
      },
    },
  });

  // 상호작용 관련 라우트
  docs.addRoute(
    "POST",
    "/interactions/posts/:postId/like",
    "게시물 좋아요/취소",
    {
      auth: true,
      tags: ["Interactions"],
      params: [{ name: "postId", type: "string", description: "게시물 ID" }],
      responses: {
        200: {
          success: true,
          message: "좋아요가 추가되었습니다.",
          isLiked: true,
          likesCount: "number",
          postId: "string",
        },
        404: {
          success: false,
          message: "게시물을 찾을 수 없습니다.",
        },
      },
    }
  );

  docs.addRoute(
    "GET",
    "/interactions/posts/:postId/likes",
    "게시물 좋아요 목록 조회",
    {
      tags: ["Interactions"],
      params: [{ name: "postId", type: "string", description: "게시물 ID" }],
      query: [
        {
          name: "page",
          type: "number",
          required: false,
          description: "페이지 번호",
        },
        {
          name: "limit",
          type: "number",
          required: false,
          description: "페이지 크기",
        },
      ],
      responses: {
        200: {
          success: true,
          message: "좋아요 목록 조회 성공",
          likes: [],
          total: "number",
          page: "number",
          totalPages: "number",
          postId: "string",
        },
      },
    }
  );

  docs.addRoute("POST", "/interactions/posts/:postId/comments", "댓글 작성", {
    auth: true,
    tags: ["Interactions"],
    params: [{ name: "postId", type: "string", description: "게시물 ID" }],
    body: {
      content: "string",
    },
    responses: {
      201: {
        success: true,
        message: "댓글이 작성되었습니다.",
        comment: {
          _id: "string",
          content: "string",
          author: "User 객체",
          post: "string",
          createdAt: "Date",
          updatedAt: "Date",
        },
      },
      400: {
        success: false,
        message: "댓글 내용을 입력해주세요.",
      },
    },
    examples: {
      "Simple Comment": {
        body: {
          content: "좋은 게시물이네요!",
        },
      },
    },
  });

  docs.addRoute(
    "GET",
    "/interactions/posts/:postId/comments",
    "댓글 목록 조회",
    {
      tags: ["Interactions"],
      params: [{ name: "postId", type: "string", description: "게시물 ID" }],
      query: [
        {
          name: "page",
          type: "number",
          required: false,
          description: "페이지 번호",
        },
        {
          name: "limit",
          type: "number",
          required: false,
          description: "페이지 크기",
        },
      ],
      responses: {
        200: {
          success: true,
          message: "댓글 목록 조회 성공",
          comments: [],
          totalComments: "number",
          currentPage: "number",
          totalPages: "number",
          postId: "string",
        },
      },
    }
  );

  // 소셜 관련 라우트
  docs.addRoute("POST", "/social/users/:userId/follow", "사용자 팔로우", {
    auth: true,
    tags: ["Social"],
    params: [
      { name: "userId", type: "string", description: "팔로우할 사용자 ID" },
    ],
    responses: {
      201: {
        success: true,
        message: "팔로우 성공",
        follow: {
          _id: "string",
          follower: "string",
          following: "string",
          createdAt: "Date",
        },
      },
      400: {
        success: false,
        message: "자기 자신을 팔로우할 수 없습니다.",
      },
    },
  });

  docs.addRoute("DELETE", "/social/users/:userId/follow", "사용자 언팔로우", {
    auth: true,
    tags: ["Social"],
    params: [
      { name: "userId", type: "string", description: "언팔로우할 사용자 ID" },
    ],
    responses: {
      200: {
        success: true,
        message: "언팔로우 성공",
        unfollowedUserId: "string",
      },
      404: {
        success: false,
        message: "팔로우 관계를 찾을 수 없습니다.",
      },
    },
  });

  docs.addRoute("GET", "/social/users/:userId/followers", "팔로워 목록 조회", {
    tags: ["Social"],
    params: [{ name: "userId", type: "string", description: "사용자 ID" }],
    query: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "팔로워 목록 조회 성공",
        followers: [],
        totalFollowers: "number",
        currentPage: "number",
        totalPages: "number",
      },
    },
  });

  docs.addRoute("GET", "/social/notifications", "알림 목록 조회", {
    auth: true,
    tags: ["Social"],
    query: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기",
      },
      {
        name: "unreadOnly",
        type: "boolean",
        required: false,
        description: "읽지 않은 알림만 조회",
      },
      {
        name: "type",
        type: "string",
        required: false,
        description: "알림 타입 (follow, like, comment)",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "알림 조회 성공",
        notifications: [],
        totalNotifications: "number",
        unreadCount: "number",
        currentPage: "number",
        totalPages: "number",
      },
    },
  });

  docs.addRoute(
    "PUT",
    "/social/notifications/:notificationId/read",
    "알림 읽음 처리",
    {
      auth: true,
      tags: ["Social"],
      params: [
        { name: "notificationId", type: "string", description: "알림 ID" },
      ],
      responses: {
        200: {
          success: true,
          message: "알림을 읽음 처리했습니다.",
          notification: {
            _id: "string",
            isRead: true,
          },
        },
        404: {
          success: false,
          message: "알림을 찾을 수 없습니다.",
        },
      },
    }
  );

  docs.addRoute(
    "PUT",
    "/social/notifications/mark-all-read",
    "모든 알림 읽음 처리",
    {
      auth: true,
      tags: ["Social"],
      responses: {
        200: {
          success: true,
          message: "모든 알림을 읽음 처리했습니다.",
          updatedCount: "number",
        },
      },
    }
  );

  docs.addRoute(
    "GET",
    "/social/notifications/unread-count",
    "읽지 않은 알림 수 조회",
    {
      auth: true,
      tags: ["Social"],
      responses: {
        200: {
          success: true,
          message: "읽지 않은 알림 수 조회 성공",
          unreadCount: "number",
        },
      },
    }
  );

  // 피드 관련 라우트
  docs.addRoute("GET", "/feed", "메인 피드 조회", {
    auth: true,
    tags: ["Feed"],
    query: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "피드 조회 성공",
        posts: [],
        totalPosts: "number",
        currentPage: "number",
        totalPages: "number",
        followingCount: "number",
      },
    },
  });

  docs.addRoute("GET", "/feed/explore", "탐색 피드 조회", {
    tags: ["Feed"],
    query: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "탐색 피드 조회 성공",
        posts: [],
        totalPosts: "number",
        currentPage: "number",
        totalPages: "number",
      },
    },
  });

  docs.addRoute("GET", "/feed/suggestions", "추천 사용자 조회", {
    auth: true,
    tags: ["Feed"],
    query: [
      {
        name: "limit",
        type: "number",
        required: false,
        description: "추천 사용자 수 (기본값: 5)",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "추천 사용자 조회 성공",
        suggestions: [],
        totalSuggestions: "number",
      },
    },
  });

  // 검색 관련 라우트
  docs.addRoute("GET", "/search/users", "사용자 검색", {
    tags: ["Search"],
    query: [
      { name: "q", type: "string", required: true, description: "검색어" },
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "사용자 검색 성공",
        searchTerm: "string",
        users: [],
        totalUsers: "number",
        currentPage: "number",
        totalPages: "number",
      },
    },
  });

  docs.addRoute("GET", "/search/posts", "게시물 검색", {
    tags: ["Search"],
    query: [
      { name: "q", type: "string", required: true, description: "검색어" },
      {
        name: "page",
        type: "number",
        required: false,
        description: "페이지 번호",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "페이지 크기",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "게시물 검색 성공",
        searchTerm: "string",
        posts: [],
        totalPosts: "number",
        currentPage: "number",
        totalPages: "number",
      },
    },
  });

  docs.addRoute("GET", "/search/all", "통합 검색", {
    tags: ["Search"],
    query: [
      { name: "q", type: "string", required: true, description: "검색어" },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "각 카테고리별 결과 수 (기본값: 5)",
      },
    ],
    responses: {
      200: {
        success: true,
        message: "통합 검색 성공",
        searchTerm: "string",
        results: {
          users: [],
          posts: [],
          hashtags: [],
        },
        totalResults: "number",
      },
    },
  });

  return docs;
}

/**
 * 자동으로 라우터에서 문서 정보 추출하는 데코레이터
 */
function documentRoute(options) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      // 실제 라우트 핸들러 실행
      const result = await originalMethod.apply(this, args);

      // 문서 정보를 글로벌 문서 컬렉션에 추가
      if (global.apiDocs) {
        global.apiDocs.addRoute(
          options.method,
          options.path,
          options.description,
          options
        );
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Express 라우터에서 자동으로 문서 생성
 */
function generateDocsFromRouter(app) {
  const docs = new APIDocumentationGenerator();

  // Express 앱의 라우터 정보 추출
  const routes = [];

  app._router.stack.forEach(function (middleware) {
    if (middleware.route) {
      // 직접 정의된 라우트
      const route = middleware.route;
      routes.push({
        method: Object.keys(route.methods)[0].toUpperCase(),
        path: route.path,
      });
    } else if (middleware.name === "router") {
      // 라우터 미들웨어
      middleware.handle.stack.forEach(function (handler) {
        if (handler.route) {
          const route = handler.route;
          routes.push({
            method: Object.keys(route.methods)[0].toUpperCase(),
            path: middleware.regexp.source.replace("\\/?", "") + route.path,
          });
        }
      });
    }
  });

  routes.forEach((route) => {
    docs.addRoute(route.method, route.path, `${route.method} ${route.path}`, {
      tags: [route.path.split("/")[1] || "Default"],
    });
  });

  return docs;
}

/**
 * Postman 컬렉션 생성
 */
function generatePostmanCollection(docs) {
  const collection = {
    info: {
      name: "Mini SNS API",
      description: "Mini SNS API Collection for testing and development",
      version: "1.0.0",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:3000/api",
        type: "string",
      },
      {
        key: "authToken",
        value: "",
        type: "string",
        description: "JWT token for authentication",
      },
    ],
    auth: {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: "{{authToken}}",
          type: "string",
        },
      ],
    },
    item: [],
  };

  const groupedRoutes = docs.groupRoutesByTag();

  for (const [tag, routes] of Object.entries(groupedRoutes)) {
    const folder = {
      name: tag,
      description: `${tag} related endpoints`,
      item: [],
    };

    routes.forEach((route) => {
      const request = {
        name: `${route.description}`,
        request: {
          method: route.method,
          header: [
            {
              key: "Content-Type",
              value: "application/json",
              type: "text",
            },
          ],
          url: {
            raw: `{{baseUrl}}${route.path}`,
            host: ["{{baseUrl}}"],
            path: route.path.split("/").filter((p) => p),
            query: route.query.map((q) => ({
              key: q.name,
              value: "",
              description: q.description,
              disabled: !q.required,
            })),
          },
          description: route.description,
        },
        response: [],
      };

      // 인증이 필요한 경우 Bearer 토큰 추가
      if (route.auth) {
        request.request.auth = {
          type: "bearer",
          bearer: [
            {
              key: "token",
              value: "{{authToken}}",
              type: "string",
            },
          ],
        };
      }

      // Request Body가 있는 경우 추가
      if (Object.keys(route.body).length > 0) {
        request.request.body = {
          mode: "raw",
          raw: JSON.stringify(route.body, null, 2),
          options: {
            raw: {
              language: "json",
            },
          },
        };
      }

      // URL 파라미터 처리
      if (route.params.length > 0) {
        route.params.forEach((param) => {
          request.request.url.path = request.request.url.path.map((segment) =>
            segment === `:${param.name}` ? `{{${param.name}}}` : segment
          );

          // 파라미터를 변수로 추가
          if (!request.request.url.variable) {
            request.request.url.variable = [];
          }
          request.request.url.variable.push({
            key: param.name,
            value: "",
            description: param.description,
          });
        });
      }

      // 응답 예시 추가
      Object.entries(route.responses).forEach(([statusCode, response]) => {
        request.response.push({
          name: `${statusCode} Response`,
          originalRequest: JSON.parse(JSON.stringify(request.request)),
          status: getStatusText(parseInt(statusCode)),
          code: parseInt(statusCode),
          header: [
            {
              key: "Content-Type",
              value: "application/json",
            },
          ],
          body: JSON.stringify(response, null, 2),
        });
      });

      folder.item.push(request);
    });

    collection.item.push(folder);
  }

  return collection;
}

/**
 * HTTP 상태 코드에 대한 텍스트 반환
 */
function getStatusText(statusCode) {
  const statusTexts = {
    200: "OK",
    201: "Created",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    500: "Internal Server Error",
  };

  return statusTexts[statusCode] || "Unknown";
}

/**
 * API 문서 생성 스크립트 (CLI에서 사용)
 */
async function generateAPIDocs() {
  try {
    const docs = createMiniSNSAPIDocs();

    console.log("📖 API 문서를 생성합니다...");

    // Markdown 문서 생성
    const markdownFile = await docs.saveToFile(
      "markdown",
      "API_DOCUMENTATION.md"
    );

    // JSON 스펙 생성
    const jsonFile = await docs.saveToFile("json", "api-spec.json");

    // Postman 컬렉션 생성
    const collection = generatePostmanCollection(docs);
    const postmanFile = path.join(
      process.cwd(),
      "mini-sns-api.postman_collection.json"
    );
    await fs.promises.writeFile(
      postmanFile,
      JSON.stringify(collection, null, 2),
      "utf8"
    );
    console.log(`📋 Postman 컬렉션이 생성되었습니다: ${postmanFile}`);

    console.log("\n✅ API 문서 생성 완료!");
    console.log(`📖 Markdown: ${markdownFile}`);
    console.log(`📋 JSON Spec: ${jsonFile}`);
    console.log(`📮 Postman: ${postmanFile}`);

    return {
      markdown: markdownFile,
      json: jsonFile,
      postman: postmanFile,
    };
  } catch (error) {
    console.error("❌ API 문서 생성 실패:", error);
    throw error;
  }
}

module.exports = {
  APIDocumentationGenerator,
  createMiniSNSAPIDocs,
  documentRoute,
  generateDocsFromRouter,
  generatePostmanCollection,
  generateAPIDocs,
};
