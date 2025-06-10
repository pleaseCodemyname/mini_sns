const express = require("express");
const { register, login } = require("../controllers/authController");
const auth = require("../middleware/auth");

const router = express.Router();

// 회원가입
router.post("/register", register);

// 로그인
router.post("/login", login);

module.exports = router;
