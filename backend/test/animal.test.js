const assert = require("node:assert/strict");
const { after, test } = require("node:test");

process.env.SGCV_DB_PATH = ":memory:";

const { db } = require("../database");
const { cadastrarAnimal } = require("../src/services/animalService");

after(() => {
  if (db.open) db.close();
});

test("cadastra animal com tutor existente e ativo", () => {
  const tutor = db.prepare(`
    INSERT INTO clientes (nome, cpf, telefone)
    VALUES (?, ?, ?)
  `).run("Ana Silva", "52998224725", "11999990000");

  const animal = cadastrarAnimal({
    nome: "Rex",
    especie: "Cão",
    cliente_id: Number(tutor.lastInsertRowid),
  });

  assert.equal(animal.id > 0, true);
  assert.equal(animal.nome, "Rex");
  assert.equal(animal.especie, "Cão");
  assert.equal(animal.cliente_id, Number(tutor.lastInsertRowid));
  assert.equal(animal.ativo, true);
  assert.deepEqual(
    db.prepare("SELECT nome, especie, cliente_id FROM animais WHERE id = ?").get(animal.id),
    { nome: "Rex", especie: "Cão", cliente_id: Number(tutor.lastInsertRowid) },
  );
});

test("exige nome, espécie e tutor válido e ativo", () => {
  const tutorInativo = db.prepare(`
    INSERT INTO clientes (nome, cpf, telefone, ativo)
    VALUES (?, ?, ?, 0)
  `).run("Bruno Costa", "12345678909", "11988887777");
  const dadosValidos = { nome: "Mimi", especie: "Gato", cliente_id: 1 };

  for (const dados of [
    { ...dadosValidos, nome: " " },
    { ...dadosValidos, especie: "" },
    { ...dadosValidos, cliente_id: undefined },
  ]) {
    assert.throws(() => cadastrarAnimal(dados), { status: 400 });
  }

  assert.throws(
    () => cadastrarAnimal({ ...dadosValidos, cliente_id: 9999 }),
    { status: 404, message: "Tutor não encontrado." },
  );
  assert.throws(
    () => cadastrarAnimal({ ...dadosValidos, cliente_id: Number(tutorInativo.lastInsertRowid) }),
    { status: 409, message: "O tutor está inativo." },
  );
});
