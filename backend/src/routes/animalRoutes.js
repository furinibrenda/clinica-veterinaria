const express = require("express");
const { cadastrarAnimal } = require("../controllers/animalController");
const { requireAuth, requireProfile } = require("../middleware/accessControl");
const { jsonObjectBody } = require("../middleware/validateJsonObject");

const router = express.Router({ caseSensitive: true, strict: true });
router.post(
  "/animais",
  requireAuth,
  requireProfile("Recepcionista"),
  jsonObjectBody,
  cadastrarAnimal,
);

module.exports = router;
