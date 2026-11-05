const express = require("express");
const { login, session, logout } = require("../controllers/authController");
const { jsonObjectBody } = require("../middleware/validateJsonObject");

const router = express.Router({ caseSensitive: true, strict: true });
router.post("/login", jsonObjectBody, login);
router.get("/session", session);
router.post("/logout", logout);

module.exports = router;
