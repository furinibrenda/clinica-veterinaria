const { db } = require("../../database");
const Animal = require("../models/animal");

const tutorPorId = db.prepare("SELECT id, ativo FROM clientes WHERE id = ?");
const inserirAnimal = db.prepare(`
  INSERT INTO animais (cliente_id, nome, especie, raca, data_nascimento)
  VALUES (@cliente_id, @nome, @especie, @raca, @data_nascimento)
`);

function animalError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cadastrarAnimal(dados) {
  const nome = typeof dados?.nome === "string" ? dados.nome.trim() : "";
  const especie = typeof dados?.especie === "string" ? dados.especie.trim() : "";
  const clienteId = Number(dados?.cliente_id);
  if (dados?.raca != null && typeof dados.raca !== "string") {
    throw animalError("Raça inválida.", 400);
  }
  if (dados?.data_nascimento != null && typeof dados.data_nascimento !== "string") {
    throw animalError("Data de nascimento inválida.", 400);
  }
  const raca = typeof dados?.raca === "string" ? dados.raca.trim() : "";
  const dataNascimento = typeof dados?.data_nascimento === "string"
    ? dados.data_nascimento.trim()
    : "";

  if (!nome) throw animalError("Nome é obrigatório.", 400);
  if (!especie) throw animalError("Espécie é obrigatória.", 400);
  if (nome.length > 120) throw animalError("Nome deve ter no máximo 120 caracteres.", 400);
  if (especie.length > 80) throw animalError("Espécie deve ter no máximo 80 caracteres.", 400);
  if (raca.length > 100) throw animalError("Raça deve ter no máximo 100 caracteres.", 400);
  if (dataNascimento) {
    const data = new Date(`${dataNascimento}T00:00:00.000Z`);
    if (
      Number.isNaN(data.getTime())
      || data.toISOString().slice(0, 10) !== dataNascimento
    ) {
      throw animalError("Data de nascimento inválida.", 400);
    }
  }
  if (!Number.isSafeInteger(clienteId) || clienteId < 1) {
    throw animalError("Tutor é obrigatório.", 400);
  }

  const tutor = tutorPorId.get(clienteId);
  if (!tutor) throw animalError("Tutor não encontrado.", 404);
  if (tutor.ativo !== 1) throw animalError("O tutor está inativo.", 409);

  const animal = new Animal({
    nome,
    especie,
    cliente_id: clienteId,
    raca: raca || null,
    data_nascimento: dataNascimento || null,
  });
  const resultado = inserirAnimal.run({
    cliente_id: animal.cliente_id,
    nome: animal.nome,
    especie: animal.especie,
    raca: animal.raca,
    data_nascimento: animal.data_nascimento,
  });
  animal.id = Number(resultado.lastInsertRowid);
  return animal;
}

module.exports = { cadastrarAnimal };
