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
    border-color: #28a745;
  }

  &:invalid {
    border-color: #dc3545;
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 1rem;

  &:hover {
    background: #218838;
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

const SuccessMessage = styled.div`
  color: #155724;
  text-align: center;
  margin-top: 1rem;
  padding: 0.5rem;
  background: #d4edda;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: 1rem;
  color: #666;

  a {
    color: #28a745;
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

const HelperText = styled.small`
  color: #666;
  margin-top: 0.25rem;
`;

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 입력시 메시지 제거
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateForm = () => {
    // 필수 필드 체크
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("모든 필드를 입력해주세요.");
      return false;
    }

    // 사용자명 검증
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError("사용자명은 3자 이상 20자 이하여야 합니다.");
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError("사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.");
      return false;
    }

    // 이메일 검증
    if (!formData.email.includes("@")) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return false;
    }

    // 비밀번호 검증
    if (formData.password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return false;
    }

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      const { confirmPassword, ...submitData } = formData;
      const result = await register(submitData);

      if (result.success) {
        setSuccess("회원가입 성공! 홈으로 이동합니다...");
        setTimeout(() => {
          navigate("/"); // 홈으로 리다이렉트
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("회원가입 중 오류가 발생했습니다.");
    }
  };

  return (
    <FormContainer>
      <Title>회원가입</Title>
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="username">사용자명</Label>
          <Input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="영문, 숫자, 언더스코어만 사용"
            required
          />
          <HelperText>3-20자, 영문/숫자/언더스코어만</HelperText>
        </InputGroup>

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

        <InputGroup>
          <Label htmlFor="confirmPassword">비밀번호 확인</Label>
          <Input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="비밀번호를 다시 입력해주세요"
            required
          />
        </InputGroup>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? <LoadingSpinner /> : "회원가입"}
        </Button>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
      </Form>

      <LinkText>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </LinkText>
    </FormContainer>
  );
};

export default RegisterForm;
