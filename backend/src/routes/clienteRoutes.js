const express = require("express");
const { cadastrarCliente } = require("../controllers/clienteController");
const { requireAuth, requireProfile } = require("../middleware/accessControl");
const { jsonObjectBody } = require("../middleware/validateJsonObject");

const router = express.Router({ caseSensitive: true, strict: true });
router.post(
  "/clientes",
  requireAuth,
  requireProfile("Recepcionista"),
  jsonObjectBody,
  cadastrarCliente,
);

module.exports = router;
