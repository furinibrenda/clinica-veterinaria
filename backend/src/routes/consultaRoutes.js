const express = require("express");
const {
  agendarConsulta,
  alterarConsulta,
  buscarAtendimento,
  cancelarConsulta,
  listarAnimaisDoTutor,
  listarConsultas,
  listarVeterinarios,
  listarVeterinariosDaAgenda,
  registrarAtendimento,
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
  "/consultas/:id/atendimento",
  requireAuth,
  requireProfile("Recepcionista", "Veterinário"),
  buscarAtendimento,
);
router.patch(
  "/consultas/:id",
  requireAuth,
  requireProfile("Recepcionista"),
  jsonObjectBody,
  alterarConsulta,
);
router.post(
  "/consultas/:id/atendimento",
  requireAuth,
  requireProfile("Veterinário"),
  jsonObjectBody,
  registrarAtendimento,
);
router.patch(
  "/consultas/:id/cancelar",
  requireAuth,
  requireProfile("Recepcionista"),
  cancelarConsulta,
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
