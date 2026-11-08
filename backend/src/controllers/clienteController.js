const {
  cadastrarCliente: criarCliente,
  listarClientes: buscarClientes,
} = require("../services/clienteService");

function listarClientes(req, res) {
  const busca = req.query.busca ?? "";
  if (typeof busca !== "string" || busca.length > 100) {
    return res.status(400).json({ error: "Informe um termo de busca válido." });
  }

  res.json({ clientes: buscarClientes(busca) });
}

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

module.exports = { cadastrarCliente, listarClientes };
