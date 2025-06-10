import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import styled from "styled-components";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginForm from "./components/Auth/LoginForm";
import RegisterForm from "./components/Auth/RegisterForm";

// 글로벌 스타일
const GlobalContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;

  * {
    box-sizing: border-box;
  }
`;

// 임시 홈 컴포넌트
const HomePage = () => {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
        background: "white",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      <h1>🎉 로그인 성공!</h1>
      <p>
        안녕하세요, <strong>{user?.username}</strong>님!
      </p>
      <p>이메일: {user?.email}</p>
      <p>가입일: {new Date(user?.createdAt).toLocaleDateString("ko-KR")}</p>

      <button
        onClick={logout}
        style={{
          padding: "0.75rem 1.5rem",
          background: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          marginTop: "1rem",
        }}
      >
        로그아웃
      </button>

      <div style={{ marginTop: "2rem", color: "#666" }}>
        <p>🚀 다음 단계: 게시물 피드 개발</p>
      </div>
    </div>
  );
};

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>로딩 중...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// 인증이 필요없는 라우트 (이미 로그인된 경우 홈으로)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>로딩 중...</div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" /> : children;
};

// 메인 앱 라우터
const AppRouter = () => {
  return (
    <Router>
      <GlobalContainer>
        <Routes>
          {/* 홈 페이지 (보호된 라우트) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* 로그인 페이지 */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            }
          />

          {/* 회원가입 페이지 */}
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterForm />
              </PublicRoute>
            }
          />

          {/* 404 - 홈으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </GlobalContainer>
    </Router>
  );
};

// 메인 App 컴포넌트
function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
