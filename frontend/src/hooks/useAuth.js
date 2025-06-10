import { useState, useEffect, createContext, useContext } from "react";
import { authAPI } from "../services/api";

// 인증 컨텍스트 생성
const AuthContext = createContext(null);

// 인증 프로바이더
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 초기 로드시 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("저장된 사용자 정보 파싱 오류:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  // 로그인
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);

      if (response.success) {
        const { token, user: userData } = response;

        // 로컬 스토리지에 저장
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        // 상태 업데이트
        setUser(userData);
        setIsAuthenticated(true);

        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error("로그인 오류:", error);
      const message = error.response?.data?.message || "로그인에 실패했습니다.";
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입
  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);

      if (response.success) {
        const { token, user: newUser } = response;

        // 로컬 스토리지에 저장
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(newUser));

        // 상태 업데이트
        setUser(newUser);
        setIsAuthenticated(true);

        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error("회원가입 오류:", error);
      const message =
        error.response?.data?.message || "회원가입에 실패했습니다.";
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃
  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 인증 Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
