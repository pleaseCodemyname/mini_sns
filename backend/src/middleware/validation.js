const Joi = require("joi");

// 회원가입 검증
const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(20).required().messages({
      "string.alphanum": "사용자명은 영문자와 숫자만 사용할 수 있습니다.",
      "string.min": "사용자명은 최소 3자 이상이어야 합니다.",
      "string.max": "사용자명은 최대 20자까지 사용할 수 있습니다.",
      "any.required": "사용자명은 필수입니다.",
    }),

    email: Joi.string().email().required().messages({
      "string.email": "올바른 이메일 형식을 입력해주세요.",
      "any.required": "이메일은 필수입니다.",
    }),

    password: Joi.string()
      .min(6)
      .max(50)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
      .required()
      .messages({
        "string.min": "비밀번호는 최소 6자 이상이어야 합니다.",
        "string.max": "비밀번호는 최대 50자까지 사용할 수 있습니다.",
        "string.pattern.base":
          "비밀번호는 대소문자, 숫자, 특수문자를 각각 최소 1개씩 포함해야 합니다.",
        "any.required": "비밀번호는 필수입니다.",
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "비밀번호가 일치하지 않습니다.",
        "any.required": "비밀번호 확인은 필수입니다.",
      }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "입력값 검증 실패",
      error: error.details[0].message,
    });
  }
  next();
};

// 로그인 검증
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "올바른 이메일 형식을 입력해주세요.",
      "any.required": "이메일은 필수입니다.",
    }),

    password: Joi.string().min(1).required().messages({
      "any.required": "비밀번호는 필수입니다.",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "입력값 검증 실패",
      error: error.details[0].message,
    });
  }
  next();
};

// 게시물 작성 검증
const validatePost = (req, res, next) => {
  const schema = Joi.object({
    content: Joi.string().min(1).max(1000).required().messages({
      "string.min": "게시물 내용을 입력해주세요.",
      "string.max": "게시물은 최대 1000자까지 작성할 수 있습니다.",
      "any.required": "게시물 내용은 필수입니다.",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "입력값 검증 실패",
      error: error.details[0].message,
    });
  }
  next();
};

// 댓글 작성 검증
const validateComment = (req, res, next) => {
  const schema = Joi.object({
    content: Joi.string().min(1).max(500).required().messages({
      "string.min": "댓글 내용을 입력해주세요.",
      "string.max": "댓글은 최대 500자까지 작성할 수 있습니다.",
      "any.required": "댓글 내용은 필수입니다.",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "입력값 검증 실패",
      error: error.details[0].message,
    });
  }
  next();
};

// 프로필 업데이트 검증
const validateProfile = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(20).optional().messages({
      "string.alphanum": "사용자명은 영문자와 숫자만 사용할 수 있습니다.",
      "string.min": "사용자명은 최소 3자 이상이어야 합니다.",
      "string.max": "사용자명은 최대 20자까지 사용할 수 있습니다.",
    }),

    intro: Joi.string().max(200).optional().allow("").messages({
      "string.max": "소개는 최대 200자까지 작성할 수 있습니다.",
    }),

    website: Joi.string().uri().optional().allow("").messages({
      "string.uri": "올바른 웹사이트 URL을 입력해주세요.",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "입력값 검증 실패",
      error: error.details[0].message,
    });
  }
  next();
};

// 비밀번호 변경 검증
const validatePasswordChange = (req, res, next) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "현재 비밀번호는 필수입니다.",
    }),

    newPassword: Joi.string()
      .min(6)
      .max(50)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
      .required()
      .messages({
        "string.min": "새 비밀번호는 최소 6자 이상이어야 합니다.",
        "string.max": "새 비밀번호는 최대 50자까지 사용할 수 있습니다.",
        "string.pattern.base":
          "새 비밀번호는 대소문자, 숫자, 특수문자를 각각 최소 1개씩 포함해야 합니다.",
        "any.required": "새 비밀번호는 필수입니다.",
      }),

    confirmNewPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "새 비밀번호가 일치하지 않습니다.",
        "any.required": "새 비밀번호 확인은 필수입니다.",
      }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "입력값 검증 실패",
      error: error.details[0].message,
    });
  }
  next();
};

// MongoDB ObjectId 검증
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;

    if (!objectIdPattern.test(id)) {
      return res.status(400).json({
        message: "올바르지 않은 ID 형식입니다.",
      });
    }
    next();
  };
};

// 페이지네이션 검증
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  if (isNaN(page) || page < 1) {
    return res.status(400).json({
      message: "페이지 번호는 1 이상의 숫자여야 합니다.",
    });
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: "페이지 크기는 1~100 사이의 숫자여야 합니다.",
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validatePost,
  validateComment,
  validateProfile,
  validatePasswordChange,
  validateObjectId,
  validatePagination,
};
