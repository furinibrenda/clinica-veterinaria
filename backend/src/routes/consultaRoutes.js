const express = require("express");
const {
  agendarConsulta,
  listarAnimaisDoTutor,
  listarConsultas,
  listarVeterinarios,
  listarVeterinariosDaAgenda,
} = require("../controllers/consultaController");
const { requireAuth, requireProfile } = require("../middleware/accessControl");
const { jsonObjectBody } = require("../middleware/validateJsonObject");

const router = express.Router({ caseSensitive: true, strict: true });
router.get(
  "/consultas",
  requireAuth,
  requireProfile("Recepcionista", "Veterinário"),
  listarConsultas,
);
router.get(
  "/agenda/veterinarios",
  requireAuth,
  requireProfile("Recepcionista", "Veterinário"),
  listarVeterinariosDaAgenda,
);
router.get(
  "/clientes/:id/animais",
  requireAuth,
  requireProfile("Recepcionista"),
  listarAnimaisDoTutor,
);
router.get(
  "/veterinarios",
  requireAuth,
  requireProfile("Recepcionista"),
  listarVeterinarios,
);
router.post(
  "/consultas",
  requireAuth,
  requireProfile("Recepcionista"),
  jsonObjectBody,
  agendarConsulta,
);

module.exports = router;
