/** 인증 라우트 --> 클라이언트의 요청을 인증 컨트롤러(authController)에 연결하는 역할
 * HTTP Method(Get, Post, Put, Delete) route에서 정의
 */

const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// 회원가입
router.post("/register", register);

// 로그인
router.post("/login", login);

module.exports = router;
