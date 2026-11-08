const { db } = require("../../database");
const Animal = require("../models/animal");

const tutorPorId = db.prepare("SELECT id, ativo FROM clientes WHERE id = ?");
const inserirAnimal = db.prepare(`
  INSERT INTO animais (cliente_id, nome, especie)
  VALUES (@cliente_id, @nome, @especie)
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

  if (!nome) throw animalError("Nome é obrigatório.", 400);
  if (!especie) throw animalError("Espécie é obrigatória.", 400);
  if (!Number.isSafeInteger(clienteId) || clienteId < 1) {
    throw animalError("Tutor é obrigatório.", 400);
  }

  const tutor = tutorPorId.get(clienteId);
  if (!tutor) throw animalError("Tutor não encontrado.", 404);
  if (tutor.ativo !== 1) throw animalError("O tutor está inativo.", 409);

  const animal = new Animal({ nome, especie, cliente_id: clienteId });
  const resultado = inserirAnimal.run({
    cliente_id: animal.cliente_id,
    nome: animal.nome,
    especie: animal.especie,
  });
  animal.id = Number(resultado.lastInsertRowid);
  return animal;
}

module.exports = { cadastrarAnimal };
