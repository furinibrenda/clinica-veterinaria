const express = require("express");
const {
  cadastrarCliente,
  inativarCliente,
  listarClientes,
} = require("../controllers/clienteController");
const { requireAuth, requireProfile } = require("../middleware/accessControl");
const { jsonObjectBody } = require("../middleware/validateJsonObject");

const router = express.Router({ caseSensitive: true, strict: true });
router.get("/clientes", requireAuth, requireProfile("Recepcionista"), listarClientes);
router.patch(
  "/clientes/:id/inativar",
  requireAuth,
  requireProfile("Recepcionista"),
  inativarCliente,
);
router.post(
  "/clientes",
  requireAuth,
  requireProfile("Recepcionista"),
  jsonObjectBody,
  cadastrarCliente,
);

module.exports = router;
