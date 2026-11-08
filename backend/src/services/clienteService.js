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

module.exports = { cadastrarCliente };
