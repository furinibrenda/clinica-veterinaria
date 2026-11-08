const { db } = require("../../database");
const Cliente = require("../models/cliente");

const clientePorCpf = db.prepare(`
  SELECT id FROM clientes
  WHERE REPLACE(REPLACE(TRIM(cpf), '.', ''), '-', '') = ?
`);
const inserirCliente = db.prepare(`
  INSERT INTO clientes (nome, cpf, telefone, email, endereco)
  VALUES (@nome, @cpf, @telefone, @email, @endereco)
`);
const inativarClientePorId = db.prepare(`
  UPDATE clientes
  SET ativo = 0
  WHERE id = ?
`);
const clientePorId = db.prepare("SELECT id FROM clientes WHERE id = ?");
const buscarClientes = db.prepare(`
  SELECT id, nome, cpf, telefone, ativo
  FROM clientes
  WHERE @busca = ''
    OR nome LIKE @nome
    OR (@cpf IS NOT NULL AND REPLACE(REPLACE(TRIM(cpf), '.', ''), '-', '') LIKE @cpf)
  ORDER BY nome COLLATE NOCASE, id
`);

function clienteError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cadastrarCliente(dados) {
  const nome = typeof dados?.nome === "string" ? dados.nome.trim() : "";
  const cpfInformado = typeof dados?.cpf === "string" ? dados.cpf.trim() : "";
  const telefone = typeof dados?.telefone === "string" ? dados.telefone.trim() : "";

  if (!nome) throw clienteError("Nome é obrigatório.", 400);
  if (!cpfInformado) throw clienteError("CPF é obrigatório.", 400);
  if (!telefone) throw clienteError("Telefone é obrigatório.", 400);

  const cpf = cpfInformado.replace(/[.-]/g, "");
  const cliente = new Cliente({
    nome,
    cpf,
    telefone,
    email: typeof dados.email === "string" ? dados.email.trim() || null : null,
    endereco: typeof dados.endereco === "string" ? dados.endereco.trim() || null : null,
  });

  if (!cliente.validarCPF()) throw clienteError("CPF inválido.", 400);
  if (clientePorCpf.get(cpf)) {
    throw clienteError("Já existe um cliente cadastrado com este CPF.", 409);
  }

  try {
    const resultado = inserirCliente.run({
      nome: cliente.nome,
      cpf: cliente.cpf,
      telefone: cliente.telefone,
      email: cliente.email,
      endereco: cliente.endereco,
    });
    cliente.id = Number(resultado.lastInsertRowid);
    return cliente;
  } catch (erro) {
    if (erro.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw clienteError("Já existe um cliente cadastrado com este CPF.", 409);
    }
    throw erro;
  }
}

function listarClientes(busca = "") {
  const termo = busca.trim();
  const cpf = termo.replace(/\D/g, "");
  return buscarClientes.all({
    busca: termo,
    nome: `%${termo}%`,
    cpf: cpf ? `%${cpf}%` : null,
  });
}

function inativarCliente(id) {
  // TODO(RN-10): Quando a tabela de consultas existir, impedir cliente com consulta "Agendada".
  const resultado = inativarClientePorId.run(id);
  if (resultado.changes === 0 && !clientePorId.get(id)) {
    throw clienteError("Cliente não encontrado.", 404);
  }
}

module.exports = { cadastrarCliente, listarClientes, inativarCliente };
