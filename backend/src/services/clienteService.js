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

function cadastrarCliente(dados) {
  const nome = typeof dados?.nome === "string" ? dados.nome.trim() : "";
  const cpfInformado = typeof dados?.cpf === "string" ? dados.cpf.trim() : "";
  const telefone = typeof dados?.telefone === "string" ? dados.telefone.trim() : "";

  if (!nome) throw new Error("Nome é obrigatório.");
  if (!cpfInformado) throw new Error("CPF é obrigatório.");
  if (!telefone) throw new Error("Telefone é obrigatório.");

  const cpf = cpfInformado.replace(/[.-]/g, "");
  const cliente = new Cliente({
    nome,
    cpf,
    telefone,
    email: typeof dados.email === "string" ? dados.email.trim() || null : null,
    endereco: typeof dados.endereco === "string" ? dados.endereco.trim() || null : null,
  });

  if (!cliente.validarCPF()) throw new Error("CPF inválido.");
  if (clientePorCpf.get(cpf)) throw new Error("Já existe um cliente cadastrado com este CPF.");

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
      throw new Error("Já existe um cliente cadastrado com este CPF.");
    }
    throw erro;
  }
}

module.exports = { cadastrarCliente };
