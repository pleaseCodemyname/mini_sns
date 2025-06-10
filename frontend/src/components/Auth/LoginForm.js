import React, { useState } from "react";
import styled from "styled-components";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

const FormContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 600;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #007bff;
  }

  &:invalid {
    border-color: #dc3545;
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 1rem;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  text-align: center;
  margin-top: 1rem;
  padding: 0.5rem;
  background: #f8d7da;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: 1rem;
  color: #666;

  a {
    color: #007bff;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 입력시 에러 메시지 제거
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 기본 유효성 검사
    if (!formData.email || !formData.password) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    if (!formData.email.includes("@")) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    try {
      const result = await login(formData);

      if (result.success) {
        navigate("/"); // 홈으로 리다이렉트
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <FormContainer>
      <Title>로그인</Title>
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="email">이메일</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="example@email.com"
            required
          />
        </InputGroup>

        <InputGroup>
          <Label htmlFor="password">비밀번호</Label>
          <Input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="6자 이상 입력해주세요"
            required
          />
        </InputGroup>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? <LoadingSpinner /> : "로그인"}
        </Button>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Form>

      <LinkText>
        계정이 없으신가요? <Link to="/register">회원가입</Link>
      </LinkText>
    </FormContainer>
  );
};

export default LoginForm;
