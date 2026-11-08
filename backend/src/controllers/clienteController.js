const { cadastrarCliente: criarCliente } = require("../services/clienteService");

function cadastrarCliente(req, res, next) {
  try {
    const cliente = criarCliente(req.body);
    res.status(201).json({ cliente });
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = { cadastrarCliente };
