const {
  cadastrarCliente: criarCliente,
  listarClientes: buscarClientes,
  inativarCliente: marcarClienteInativo,
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

function inativarCliente(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador de cliente inválido." });
  }

  try {
    marcarClienteInativo(id);
    res.json({ message: "Cliente inativado com sucesso." });
  } catch (error) {
    if (error.status === 404) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = { cadastrarCliente, listarClientes, inativarCliente };
