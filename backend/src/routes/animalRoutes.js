const express = require("express");
const {
  cadastrarAnimal,
  inativarAnimal,
  listarAnimais,
} = require("../controllers/animalController");
const { requireAuth, requireProfile } = require("../middleware/accessControl");
const { jsonObjectBody } = require("../middleware/validateJsonObject");

const router = express.Router({ caseSensitive: true, strict: true });
router.get("/animais", requireAuth, requireProfile("Recepcionista"), listarAnimais);
router.patch(
  "/animais/:id/inativar",
  requireAuth,
  requireProfile("Recepcionista"),
  inativarAnimal,
);
router.post(
  "/animais",
  requireAuth,
  requireProfile("Recepcionista"),
  jsonObjectBody,
  cadastrarAnimal,
);

module.exports = router;
