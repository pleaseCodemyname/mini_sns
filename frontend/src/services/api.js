import axios from "axios";

// API 기본 설정
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 401 에러시 토큰 제거 및 로그인 페이지로 리다이렉트
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 인증 API
export const authAPI = {
  // 회원가입
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  // 로그인
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  // 로그아웃 (클라이언트 측)
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};

// 사용자 API
export const userAPI = {
  // 내 프로필 조회
  getMyProfile: async () => {
    const response = await api.get("/users/me");
    return response.data;
  },

  // 사용자 프로필 조회
  getUserProfile: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  // 프로필 업데이트
  updateProfile: async (userData) => {
    const response = await api.put("/users/me", userData);
    return response.data;
  },
};

// 게시물 API
export const postAPI = {
  // 게시물 목록 조회
  getPosts: async (page = 1, limit = 10) => {
    const response = await api.get(`/posts?page=${page}&limit=${limit}`);
    return response.data;
  },

  // 게시물 생성
  createPost: async (postData) => {
    const response = await api.post("/posts", postData);
    return response.data;
  },

  // 게시물 좋아요
  likePost: async (postId) => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },

  // 댓글 추가
  addComment: async (postId, comment) => {
    const response = await api.post(`/posts/${postId}/comments`, {
      content: comment,
    });
    return response.data;
  },
};

export default api;
